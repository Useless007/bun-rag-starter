import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { TokenChunker } from "chonkie";
import OpenAI from "openai";
import { pipeline, env, type Pipeline, type PipelineType, type Tensor } from '@xenova/transformers';
import redisClient from './redis-client'; // Import the Redis client
import { buildGraphFromChunks, queryGraph } from './graph-builder';


// --- CONFIGURATION ---
const apiKey = process.env.DEEPSEEK_API_KEY;
const userQuestion = "How do I use the Cron in Elysia?";
const documentFilename = 'docs/llms-full.txt';
const BATCH_SIZE = 10;
const REDIS_INDEX_NAME = 'rag-index';
const REDIS_KEY_PREFIX = 'chunk:';
const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour
// --- END OF CONFIGURATION ---

env.allowLocalModels = false;

class EmbeddingPipeline {
    static task: PipelineType = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: Promise<Pipeline> | null = null;

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            console.log('[+] Loading embedding model...');
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

async function createRedisIndex() {
    try {
        await redisClient.ft.create(REDIS_INDEX_NAME, {
            '$.text': { type: 'TEXT', AS: 'text' },
            '$.embedding': {
                type: 'VECTOR',
                ALGORITHM: 'HNSW',
                TYPE: 'FLOAT32',
                DIM: 384, // Dimension of all-MiniLM-L6-v2 embeddings
                DISTANCE_METRIC: 'COSINE',
                AS: 'embedding'
            }
        }, {
            ON: 'JSON',
            PREFIX: REDIS_KEY_PREFIX
        });
        console.log(`[+] Redis index "${REDIS_INDEX_NAME}" created successfully.`);
    } catch (e: any) {
        if (e.message.includes('Index already exists')) {
            console.log(`[=] Redis index "${REDIS_INDEX_NAME}" already exists. Skipping creation.`);
        } else {
            console.error('[-] Error creating Redis index:', e);
            throw e;
        }
    }
}

async function indexDocument(filePath: string, embedder: Pipeline): Promise<string[] | null> {
    console.log(`\nIndexing document: ${documentFilename}`);

    if (!fs.existsSync(filePath)) {
        console.error(`  > Error: File not found at ${filePath}`);
        return null;
    }
    const documentText = fs.readFileSync(filePath, 'utf-8');

    const chunker = await TokenChunker.create({ chunkSize: 512, chunkOverlap: 10, minCharactersPerChunk: 24 });
    const rawChunks = await chunker(documentText);
    
    const chunks = (Array.isArray(rawChunks) ? rawChunks : []).map(chunk => {
        return (typeof chunk === 'object' && chunk !== null && typeof (chunk as any).text === 'string') ? (chunk as any).text : null;
    }).filter((chunk): chunk is string => chunk !== null && chunk.trim() !== '');

    console.log(`  > Document chunked into ${chunks.length} pieces.`);
    console.log(`  > Generating and storing embeddings in Redis...`);

    const multi = redisClient.multi();
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchEmbeddings: Tensor[] = await embedder(batch, { pooling: 'mean', normalize: true });

        for (let j = 0; j < batch.length; j++) {
            const chunkText = batch[j];
            const embedding = Array.from(batchEmbeddings[j].data);
            const key = `${REDIS_KEY_PREFIX}${i + j}`;
            multi.json.set(key, '$', { text: chunkText, embedding: embedding });
        }
    }
    await multi.exec();
    console.log(`  > Successfully stored ${chunks.length} chunks and embeddings in Redis.`);
    return chunks;
}

async function searchRelevantChunks(query: string, embedder: Pipeline) {
    console.log('\n[3/4] Searching for relevant chunks...');
    const questionEmbeddingTensor: Tensor = await embedder(query, { pooling: 'mean', normalize: true });
    const questionEmbedding = Buffer.from(new Float32Array(questionEmbeddingTensor.data).buffer);

    const searchQuery = `*=>[KNN 5 @embedding $query_vector AS score]`;

    const results = await redisClient.ft.search(REDIS_INDEX_NAME, searchQuery, {
        PARAMS: { query_vector: questionEmbedding },
        RETURN: ['text', 'score'],
        DIALECT: 2
    });

    console.log(`  > Found ${results.documents.length} relevant chunks.`);
    return results.documents.map(doc => doc.value.text as string);
}

async function askLLM(context: string, question: string) {
    const useOllama = process.env.USE_OLLAMA === 'true';
    const llmProvider = useOllama ? 'Ollama' : 'DeepSeek';
    console.log(`\n[3/3] Sending context and question to ${llmProvider} API...`);

    const cacheKey = `answer:${llmProvider}:${question}`;

    // Check cache first
    const cachedAnswer = await redisClient.get(cacheKey);
    if (cachedAnswer) {
        console.log("  > Found answer in cache!");
        return cachedAnswer;
    }

    console.log("  > No cache hit. Querying LLM...");

    const openaiConfig: OpenAI.ClientOptions = useOllama
        ? { baseURL: "http://ollama:11434/v1", apiKey: "ollama" } // apiKey is required but not used by Ollama
        : { apiKey, baseURL: "https://api.deepseek.com/v1" };

    const model = useOllama ? "llama3" : "deepseek-chat"; // Example model for Ollama

    const llmClient = new OpenAI(openaiConfig);

    const prompt = `
        Based *only* on the following context, please answer the question.

        Context: "${context}"

        Question: "${question}"
    `;

    try {
        const completion = await llmClient.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: "You are a helpful assistant that answers questions based strictly on the provided context." },
                { role: "user", content: prompt },
            ],
        });

        const answer = completion.choices[0].message.content;

        // Cache the new answer
        if (answer) {
            await redisClient.set(cacheKey, answer, { 'EX': CACHE_EXPIRATION_SECONDS });
            console.log("  > Saved new answer to cache.");
        }

        return answer;

    } catch (error) {
        console.error("\n[-] Error calling DeepSeek API:", error);
        return null;
    }
}


async function main() {
    if (!apiKey) {
        console.error("\n!!! DEEPSEEK_API_KEY not found. Please ensure it is set in your .env file.");
        return;
    }

    console.log("--- Starting RAG process with Redis ---");

    const embedder = await EmbeddingPipeline.getInstance();
    const filePath = path.join(process.cwd(), documentFilename);

    // Setup Redis Index
    await createRedisIndex();

    // Check if the document is already indexed in Redis
    const indexedKeys = await redisClient.keys(`${REDIS_KEY_PREFIX}*`);
    if (indexedKeys.length === 0) {
        // If not indexed, we also assume the graph has not been built
        console.log('\n[1/4] Document not indexed. Starting full indexing process...');
        const chunks = await indexDocument(filePath, embedder);
        if (chunks) {
            await buildGraphFromChunks(chunks);
        }
    } else {
        console.log(`\n[1/4] Document appears to be already indexed (${indexedKeys.length} chunks found). Skipping indexing.`);
        console.log('[2/4] Skipping graph building.');
    }

    // --- QUERYING ---

    // 1. Query the graph
    const graphContext = await queryGraph(userQuestion);

    // 2. Search for chunks relevant to the user's question
    const relevantChunks = await searchRelevantChunks(userQuestion, embedder);

    // 3. Combine contexts
    const vectorContext = relevantChunks.join('\n\n---\n\n');
    const combinedContext = `${graphContext}\n\n${vectorContext}`;

    console.log(`  > Combined Context Preview: "${combinedContext.substring(0, 400)}"...`);


    // 4. Ask the LLM with the retrieved context
    const answer = await askLLM(combinedContext, userQuestion);

    if (answer) {
        console.log("\n[+] Final Answer Received:");
        console.log(answer);
    }

    console.log("\n--- RAG process finished ---");

    // Disconnect from Redis cleanly
    await redisClient.quit();
}

main();
