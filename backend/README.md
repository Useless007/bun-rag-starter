# 🔧 Backend - RAG API Server

Backend ของระบบ RAG ที่ใช้ Bun + Elysia สำหรับสร้าง REST API

## 🚀 เทคโนโล ジ ีหลัก

- **Runtime**: Bun v1.2+
- **Framework**: Elysia (Fast & type-safe)
- **Vector DB**: Redis Stack
- **Graph DB**: Neo4j
- **AI/ML**: DeepSeek API / Ollama
- **Embeddings**: @xenova/transformers (local)

## 📁 โครงสร้างไฟล์

```
backend/
├── api-server.ts        # Main API endpoints (Elysia)
├── rag-functions.ts     # RAG pipeline core logic
├── graph-builder.ts     # Knowledge Graph management
├── redis-client.ts      # Redis connection singleton
├── deepseek-example.ts  # Original example script
├── Dockerfile           # Container build config
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── docs/               # Sample documents
```

## 🔌 API Endpoints

### Health Check

```
GET /api/health
Response: { "status": "ok" }
```

### จัดการเอกสาร

**ดูรายการเอกสาร**

```
GET /api/documents
Response: [
  {
    "id": "doc-123",
    "filename": "example.pdf",
    "uploadedAt": "2025-11-06T10:00:00Z",
    "size": 1024000,
    "chunkCount": 45
  }
]
```

**อัพโหลดเอกสาร**

```
POST /api/documents
Content-Type: multipart/form-data
Body: { file: <file> }

Response: {
  "success": true,
  "document": { ... }
}
```

**ลบเอกสาร**

```
DELETE /api/documents/:id
Response: { "success": true }
```

### แชท

**ถามคำถาม**

```
POST /api/chat
Content-Type: application/json
Body: { "question": "คำถาม..." }

Response: {
  "answer": "คำตอบจาก LLM..."
}
```

## 🏃 วิธีรัน Local

### ติดตั้ง Dependencies

```bash
cd backend
bun install
```

### ตั้งค่า Environment Variables

ต้องมี Redis และ Neo4j รันอยู่ก่อน จากนั้นตั้งค่า:

```bash
export DEEPSEEK_API_KEY="your-api-key"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="password"
```

### เริ่มต้น API Server

```bash
bun run api-server.ts
```

Server จะรันที่ `http://localhost:3000`

## 🔬 RAG Pipeline Details

### 1. Indexing Process

เมื่อมีการอัพโหลดเอกสาร:

```typescript
// 1. อ่านไฟล์
const text = readFile(filePath);

// 2. แบ่ง chunks (512 tokens, overlap 10)
const chunks = await chunker(text);

// 3. สร้าง embeddings (384 dim)
const embeddings = await embedder(chunks);

// 4. เก็บใน Redis
await redis.json.set(key, { text, embedding });

// 5. Extract entities & relationships
const graph = await extractGraphFromChunk(chunk);

// 6. เก็บใน Neo4j
await neo4j.run(createRelationshipQuery);
```

### 2. Query Process

เมื่อมีคำถามเข้ามา:

```typescript
// 1. Extract entities จากคำถาม (ด้วย LLM)
const entities = await extractEntitiesFromQuestion(question);

// 2. Query Neo4j graph
const graphContext = await queryGraph(entities);

// 3. Vector search ใน Redis
const embedding = await embedder(question);
const chunks = await redis.ft.search(vectorQuery);

// 4. รวม context
const context = graphContext + "\n\n" + chunks.join("\n\n");

// 5. ส่งให้ LLM
const answer = await llm.chat.completions.create({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: context + question },
  ],
});

// 6. Cache คำตอบ
await redis.set(`answer:${question}`, answer);
```

## 🧠 Knowledge Graph

ใช้ Neo4j เก็บ entities และ relationships:

```cypher
// ตัวอย่าง Graph Query
MATCH (e:Entity)-[r]-(neighbor)
WHERE e.name IN ['Elysia', 'Cron']
RETURN e.name, type(r), neighbor.name
LIMIT 10
```

Entities และ Relations ถูก extract ด้วย LLM โดยอัตโนมัติ:

- **Entities**: คอนเซ็ปต์, เทคโนโลยี, เครื่องมือ
- **Relations**: USES, PROVIDES, REQUIRES, IS_A, HAS_FEATURE

## 📊 Redis Index Schema

```javascript
{
  "$.text": { type: "TEXT" },
  "$.documentId": { type: "TAG" },
  "$.embedding": {
    type: "VECTOR",
    algorithm: "HNSW",
    dim: 384,
    metric: "COSINE"
  }
}
```

## 🎯 LLM Railguards

System prompt ถูกออกแบบให้:

- ตอบจากเอกสารเท่านั้น ไม่ใช้ความรู้ภายนอก
- ตอบแบบกระชับ ไม่แสดงโค้ดยาวๆ
- ยกตัวอย่างโค้ดสั้นๆ 3-5 บรรทัดเท่านั้น
- อธิบายด้วยคำพูดเป็นหลัก
- จำกัด max_tokens = 500

## 🛠️ Development Tips

### รัน Example Script

```bash
bun run deepseek-example.ts
```

### Clear Redis Cache

```bash
docker exec -it redis-stack redis-cli FLUSHALL
```

### Query Neo4j

```bash
docker exec -it neo4j cypher-shell -u neo4j -p password
```

### Debug Mode

เพิ่ม console.log ใน `rag-functions.ts` เพื่อดู:

- Chunk count
- Embedding dimensions
- Graph extraction results
- LLM responses

## 📦 Docker Build

```bash
cd backend
docker build -t rag-api .
docker run -p 3000:3000 rag-api
```

## 🔐 Environment Variables

| Variable           | คำอธิบาย                | Default                 |
| ------------------ | ----------------------- | ----------------------- |
| `DEEPSEEK_API_KEY` | DeepSeek API key        | -                       |
| `USE_OLLAMA`       | ใช้ Ollama แทน DeepSeek | `false`                 |
| `REDIS_HOST`       | Redis hostname          | `localhost`             |
| `REDIS_PORT`       | Redis port              | `6379`                  |
| `NEO4J_URI`        | Neo4j connection URI    | `bolt://localhost:7687` |
| `NEO4J_USER`       | Neo4j username          | `neo4j`                 |
| `NEO4J_PASSWORD`   | Neo4j password          | `password`              |

## 📚 Dependencies หลัก

```json
{
  "elysia": "^1.4.15",
  "@elysiajs/cors": "^1.4.0",
  "@elysiajs/static": "^1.4.6",
  "@xenova/transformers": "^2.17.2",
  "chonkie": "^0.3.0",
  "openai": "^4.84.0",
  "redis": "^4.7.0",
  "neo4j-driver": "^5.26.0"
}
```

## 🐛 Common Issues

### Error: Cannot find module 'sharp'

**แก้ไข**: Dockerfile build sharp from source แล้ว

### Error: Redis connection refused

**แก้ไข**: ตรวจสอบว่า Redis container รันอยู่

### Error: Neo4j not ready

**แก้ไข**: รอให้ healthcheck ผ่าน (ประมาณ 30 วินาที)

### Error: Out of memory during embedding

**แก้ไข**: ลด BATCH_SIZE ใน `rag-functions.ts`
