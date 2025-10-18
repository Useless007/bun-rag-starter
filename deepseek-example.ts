import fs from 'fs';
import path from 'path';
import { TokenChunker } from "chonkie";
import OpenAI from "openai";
import {
    pipeline, 
    env,
    type Pipeline,
    type PipelineType,
    type Tensor,
} from '@xenova/transformers';

// --- CONFIGURATION ---
const apiKey = "REMOVED_API_KEY";
const userQuestion = "How do I use the Cron in Elysia?";
const documentFilename = 'docs/llms-full.txt';
const BATCH_SIZE = 10; // Process 10 chunks at a time
// --- END OF CONFIGURATION ---

// Minimal logging from transformers.js
env.allowLocalModels = false;

class EmbeddingPipeline {
    static task: PipelineType = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: Promise<Pipeline> | null = null;

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            console.log('[2/7] Loading embedding model... (This may take a moment on first run)');
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
}

async function main() {
    if (apiKey === "YOUR_DEEPSEEK_API_KEY_HERE") {
        console.error("\n!!! Please put your DeepSeek API Key in deepseek-example.ts before running.");
        return;
    }

    console.log("--- Starting RAG process ---");

    // 1. Read Document
    console.log(`\n[1/7] Reading document: ${documentFilename}`);
    const filePath = path.join(process.cwd(), documentFilename);
    if (!fs.existsSync(filePath)) {
        console.error(`  > Error: File not found at ${filePath}`);
        return;
    }
    const documentText = fs.readFileSync(filePath, 'utf-8');

    // 2. Chunk Document
    const chunker = await TokenChunker.create({ chunkSize: 512, chunkOverlap: 10, minCharactersPerChunk: 24,});
    const rawChunks = await chunker(documentText);
    
    // 3. Clean and Filter Chunks
    console.log('\n[2/7] Cleaning and filtering text chunks...');
    const chunks = (Array.isArray(rawChunks) ? rawChunks : []).map(chunk => {
        if (typeof chunk === 'string') return chunk;
        if (typeof chunk === 'object' && chunk !== null && typeof (chunk as any).text === 'string') return (chunk as any).text;
        return null;
    }).filter((chunk): chunk is string => chunk !== null && chunk.trim() !== '');
    console.log(`  > Started with ${Array.isArray(rawChunks) ? rawChunks.length : 0} raw chunks, ended with ${chunks.length} clean chunks.`);


    // 4. Get Embedding Model
    const embedder = await EmbeddingPipeline.getInstance();

    // 5. Generate Embeddings in Batches
    console.log(`\n[3/7] Generating embeddings for ${chunks.length} chunks in batches of ${BATCH_SIZE}...`);
    const chunkEmbeddings: Tensor[] = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        console.log(`  > Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(chunks.length / BATCH_SIZE)}...`);
        const batchEmbeddings = await embedder(batch, { pooling: 'mean', normalize: true });
        chunkEmbeddings.push(...batchEmbeddings);
    }

    // 6. Generate Embedding for the user's question
    console.log('\n[4/7] Generating embedding for the user question...');
    const questionEmbedding = await embedder(userQuestion, { pooling: 'mean', normalize: true });

    // 7. Find the most relevant chunk (Semantic Search)
    console.log('\n[5/7] Performing semantic search...');
    let bestChunkIndex = -1;
    let maxSimilarity = -1;

    for (let i = 0; i < chunkEmbeddings.length; i++) {
        const similarity = cosineSimilarity(questionEmbedding.data, chunkEmbeddings[i].data);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestChunkIndex = i;
        }
    }

    // Create a context window of chunks around the best one
    const contextWindow = 2; // 2 chunks before and 2 after = up to 5 total
    const startIndex = Math.max(0, bestChunkIndex - contextWindow);
    const endIndex = Math.min(chunks.length - 1, bestChunkIndex + contextWindow);

    const contextChunks = chunks.slice(startIndex, endIndex + 1);
    const combinedContext = contextChunks.join('\n\n---\n\n'); // Join chunks with a separator

    console.log(`  > Providing ${contextChunks.length} chunks as context (from index ${startIndex} to ${endIndex}).`);
    console.log(`  > Combined Context Preview: "${combinedContext.substring(0, 400)}"...`);

    // 8. Ask the LLM
    console.log('\n[6/7] Sending combined context and question to DeepSeek API...');
    const deepseek = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const prompt = `
        Based *only* on the following context, please answer the question.

        Context: "${combinedContext}"

        Question: "${userQuestion}"
    `;

    try {
        const completion = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "You are a helpful assistant that answers questions based strictly on the provided context." },
                { role: "user", content: prompt },
            ],
        });

        const answer = completion.choices[0].message.content;
        console.log("\n[7/7] Final Answer Received:");
        console.log(answer);

    } catch (error) {
        console.error("\nError calling DeepSeek API:", error);
    }

    console.log("\n--- RAG process finished ---");
}

main();