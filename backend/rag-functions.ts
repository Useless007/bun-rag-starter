import "dotenv/config";
import fs from "fs";
import OpenAI from "openai";
import {
  pipeline,
  env,
  type Pipeline,
  type Tensor,
} from "@xenova/transformers";
import { TokenChunker } from "chonkie";
import redisClient from "./redis-client";
import { buildGraphFromChunks, queryGraph } from "./graph-builder";

// --- CONFIGURATION ---
const apiKey = process.env.DEEPSEEK_API_KEY;
const BATCH_SIZE = 10;
const REDIS_INDEX_NAME = "rag-index";
const REDIS_KEY_PREFIX = "chunk:";
const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour
// --- END OF CONFIGURATION ---

env.allowLocalModels = false;

class EmbeddingPipeline {
  static task = "feature-extraction" as const;
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: Promise<Pipeline> | null = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      console.log("[+] Loading embedding model...");
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export async function createRedisIndex() {
  try {
    await redisClient.ft.create(
      REDIS_INDEX_NAME,
      {
        "$.text": { type: "TEXT", AS: "text" },
        "$.documentId": { type: "TAG", AS: "documentId" },
        "$.embedding": {
          type: "VECTOR",
          ALGORITHM: "HNSW",
          TYPE: "FLOAT32",
          DIM: 384,
          DISTANCE_METRIC: "COSINE",
          AS: "embedding",
        },
      },
      {
        ON: "JSON",
        PREFIX: REDIS_KEY_PREFIX,
      }
    );
    console.log(`[+] Redis index "${REDIS_INDEX_NAME}" created successfully.`);
  } catch (e: any) {
    if (e.message.includes("Index already exists")) {
      console.log(`[=] Redis index "${REDIS_INDEX_NAME}" already exists.`);
    } else {
      console.error("[-] Error creating Redis index:", e);
      throw e;
    }
  }
}

export async function indexDocument(
  filePath: string,
  documentId: string
): Promise<number> {
  console.log(`  > Indexing document: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`  > Error: File not found at ${filePath}`);
    return 0;
  }

  const documentText = fs.readFileSync(filePath, "utf-8");
  const chunker = await TokenChunker.create({
    chunkSize: 512,
    chunkOverlap: 10,
    minCharactersPerChunk: 24,
  });
  const rawChunks = await chunker(documentText);

  const chunks = (Array.isArray(rawChunks) ? rawChunks : [])
    .map((chunk) => {
      return typeof chunk === "object" &&
        chunk !== null &&
        typeof (chunk as any).text === "string"
        ? (chunk as any).text
        : null;
    })
    .filter((chunk): chunk is string => chunk !== null && chunk.trim() !== "");

  console.log(`  > Document chunked into ${chunks.length} pieces.`);
  console.log(`  > Generating embeddings and storing in Redis...`);

  const embedder = await EmbeddingPipeline.getInstance();
  const multi = redisClient.multi();

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchEmbeddings: Tensor[] = await embedder(batch, {
      pooling: "mean",
      normalize: true,
    });

    for (let j = 0; j < batch.length; j++) {
      const chunkText = batch[j];
      const embedding = Array.from(batchEmbeddings[j].data);
      const key = `${REDIS_KEY_PREFIX}${documentId}:${i + j}`;
      multi.json.set(key, "$", {
        text: chunkText,
        embedding: embedding,
        documentId: documentId,
      });
    }
  }
  await multi.exec();
  console.log(`  > Successfully stored ${chunks.length} chunks.`);

  // Build graph from chunks
  console.log(`  > Building knowledge graph...`);
  await buildGraphFromChunks(chunks);

  return chunks.length;
}

export async function deleteDocumentFromIndex(
  documentId: string
): Promise<void> {
  console.log(`  > Deleting document ${documentId} from index...`);

  // Find all keys for this document
  const keys = await redisClient.keys(`${REDIS_KEY_PREFIX}${documentId}:*`);

  if (keys.length > 0) {
    await redisClient.del(keys);
    console.log(`  > Deleted ${keys.length} chunks from Redis.`);
  }
}

export async function searchRelevantChunks(query: string): Promise<string[]> {
  console.log("  > Searching for relevant chunks...");

  const embedder = await EmbeddingPipeline.getInstance();
  const questionEmbeddingTensor: Tensor = await embedder(query, {
    pooling: "mean",
    normalize: true,
  });
  const questionEmbedding = Buffer.from(
    new Float32Array(questionEmbeddingTensor.data).buffer
  );

  const searchQuery = `*=>[KNN 5 @embedding $query_vector AS score]`;

  const results = await redisClient.ft.search(REDIS_INDEX_NAME, searchQuery, {
    PARAMS: { query_vector: questionEmbedding },
    RETURN: ["text", "score"],
    DIALECT: 2,
  });

  console.log(`  > Found ${results.documents.length} relevant chunks.`);
  return results.documents.map((doc) => doc.value.text as string);
}

export async function askLLM(
  context: string,
  question: string
): Promise<string | null> {
  const useOllama = process.env.USE_OLLAMA === "true";
  const llmProvider = useOllama ? "Ollama" : "DeepSeek";

  const cacheKey = `answer:${llmProvider}:${question}`;

  // Check cache first
  const cachedAnswer = await redisClient.get(cacheKey);
  if (cachedAnswer) {
    console.log("  > Found answer in cache!");
    return cachedAnswer;
  }

  console.log(`  > Querying ${llmProvider}...`);

  const openaiConfig: OpenAI.ClientOptions = useOllama
    ? { baseURL: "http://ollama:11434/v1", apiKey: "ollama" }
    : { apiKey, baseURL: "https://api.deepseek.com/v1" };

  const model = useOllama ? "llama3" : "deepseek-chat";
  const llmClient = new OpenAI(openaiConfig);

  const systemPrompt = `คุณเป็นที่ปรึกษาด้านเอกสาร (Document Advisor) ที่ช่วยตอบคำถามจากเนื้อหาในเอกสารเท่านั้น

กฎการตอบคำถาม:
1. ตอบจากข้อมูลในเอกสารที่ให้มาเท่านั้น ห้ามใช้ความรู้ภายนอก
2. ตอบด้วยภาษาไทยหรือภาษาอังกฤษตามภาษาของคำถาม
3. ตอบแบบกระชับ ชัดเจน ไม่ใช้ประโยคยาวเกินจำเป็น
4. ห้ามแสดงโค้ดยาวๆ - หากต้องยกตัวอย่างโค้ด ให้แสดงเพียง 3-5 บรรทัดสั้นๆ ที่สำคัญที่สุด
5. หากคำถามถามเกี่ยวกับโค้ด ให้อธิบายด้วยคำพูดเป็นหลัก พร้อมยกตัวอย่างสั้นๆ
6. ใช้ bullet points หรือลิสต์เมื่อมีหลายข้อมูล
7. หากไม่มีข้อมูลในเอกสาร ให้บอกตรงๆว่า "ไม่พบข้อมูลนี้ในเอกสาร"

รูปแบบตัวอย่างที่ดี:
- อธิบายแนวคิด/วิธีการ
- ยกตัวอย่างสั้นๆ (ไม่เกิน 3-5 บรรทัด)
- สรุปใจความสำคัญ`;

  const prompt = `เอกสารอ้างอิง:
${context}

คำถาม: ${question}

คำตอบ (กระชับ ไม่แสดงโค้ดยาว):`;

  try {
    const completion = await llmClient.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1200, // จำกัดความยาวคำตอบ
    });

    const answer = completion.choices[0].message.content;

    // Cache the answer
    if (answer) {
      await redisClient.set(cacheKey, answer, { EX: CACHE_EXPIRATION_SECONDS });
    }

    return answer;
  } catch (error) {
    console.error("[-] Error calling LLM API:", error);
    return null;
  }
}

export async function searchAndAsk(question: string): Promise<string | null> {
  // 1. Query the knowledge graph
  const graphContext = await queryGraph(question);

  // 2. Search for relevant chunks
  const relevantChunks = await searchRelevantChunks(question);

  // 3. Combine contexts
  const vectorContext = relevantChunks.join("\n\n---\n\n");
  const combinedContext = `${graphContext}\n\n${vectorContext}`;

  // 4. Ask the LLM
  const answer = await askLLM(combinedContext, question);

  return answer;
}

export async function initializeRAG() {
  console.log("[+] Initializing RAG system...");
  await createRedisIndex();
  await EmbeddingPipeline.getInstance();
  console.log("[+] RAG system ready.");
}
