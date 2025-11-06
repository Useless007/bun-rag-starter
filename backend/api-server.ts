import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import fs from "fs";
import path from "path";
import {
  indexDocument,
  searchAndAsk,
  deleteDocumentFromIndex,
  initializeRAG,
} from "./rag-functions";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const DOCUMENTS_META_FILE = path.join(UPLOAD_DIR, "documents.json");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Initialize documents metadata file
if (!fs.existsSync(DOCUMENTS_META_FILE)) {
  fs.writeFileSync(DOCUMENTS_META_FILE, JSON.stringify([]));
}

interface DocumentMeta {
  id: string;
  filename: string;
  uploadedAt: string;
  size: number;
  chunkCount: number;
}

function getDocuments(): DocumentMeta[] {
  const data = fs.readFileSync(DOCUMENTS_META_FILE, "utf-8");
  return JSON.parse(data);
}

function saveDocuments(docs: DocumentMeta[]) {
  fs.writeFileSync(DOCUMENTS_META_FILE, JSON.stringify(docs, null, 2));
}

const app = new Elysia()
  .use(cors())

  // Health check
  .get("/api/health", () => ({ status: "ok" }))

  // List all documents
  .get("/api/documents", () => {
    return getDocuments();
  })

  // Upload and index document
  .post(
    "/api/documents",
    async ({ body }) => {
      const { file } = body;

      if (!file || !(file instanceof File)) {
        return { error: "No file provided" };
      }

      const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const filename = file.name;
      const filepath = path.join(UPLOAD_DIR, `${id}-${filename}`);

      // Save file
      await Bun.write(filepath, file);

      // Index document
      console.log(`\n[+] Indexing uploaded document: ${filename}`);
      const chunkCount = await indexDocument(filepath, id);

      // Save metadata
      const docs = getDocuments();
      const newDoc: DocumentMeta = {
        id,
        filename,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        chunkCount: chunkCount || 0,
      };
      docs.push(newDoc);
      saveDocuments(docs);

      return { success: true, document: newDoc };
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )

  // Delete document
  .delete("/api/documents/:id", async ({ params: { id } }) => {
    const docs = getDocuments();
    const docIndex = docs.findIndex((d) => d.id === id);

    if (docIndex === -1) {
      return { error: "Document not found" };
    }

    const doc = docs[docIndex];
    const filepath = path.join(UPLOAD_DIR, `${id}-${doc.filename}`);

    // Delete file
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete from index
    await deleteDocumentFromIndex(id);

    // Remove from metadata
    docs.splice(docIndex, 1);
    saveDocuments(docs);

    return { success: true };
  })

  // Chat/Query endpoint
  .post(
    "/api/chat",
    async ({ body }) => {
      const { question } = body;

      if (!question) {
        return { error: "No question provided" };
      }

      console.log(`\n[?] User question: ${question}`);
      const answer = await searchAndAsk(question);

      return { answer };
    },
    {
      body: t.Object({
        question: t.String(),
      }),
    }
  )

  .listen(3000);

console.log(`
🚀 RAG API Server is running at http://localhost:${app.server?.port}
`);

// Initialize RAG system
console.log("🔄 Initializing RAG system...");
await initializeRAG();
console.log("✅ RAG system ready!");

export type App = typeof app;
