import "dotenv/config";
import neo4j from "neo4j-driver";
import OpenAI from "openai";

// --- CONFIGURATION ---
const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password";
const apiKey = process.env.DEEPSEEK_API_KEY; // Re-using DeepSeek API key for now

// --- NEO4J DRIVER ---
let driver: neo4j.Driver;

function getDriver(): neo4j.Driver {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
  }
  return driver;
}

async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}

// --- GRAPH BUILDING LOGIC ---

/**
 * Extract entities and relationships from a text chunk using LLM.
 * @param textChunk The text to process.
 * @returns A promise that resolves to a simplified graph structure.
 */
async function extractGraphFromChunk(
  textChunk: string
): Promise<{ entities: string[]; relationships: string[] }> {
  // Skip very short chunks
  if (textChunk.length < 50) {
    return { entities: [], relationships: [] };
  }

  const useOllama = process.env.USE_OLLAMA === "true";
  const openaiConfig = useOllama
    ? { baseURL: "http://ollama:11434/v1", apiKey: "ollama" }
    : { apiKey, baseURL: "https://api.deepseek.com/v1" };

  const model = useOllama ? "llama3" : "deepseek-chat";
  const llmClient = new OpenAI(openaiConfig);

  const systemPrompt = `คุณเป็นผู้เชี่ยวชาญในการสร้าง Knowledge Graph จากข้อความ
    
งานของคุณ: วิเคราะห์ข้อความและระบุ entities และ relationships ที่สำคัญ

กฎการทำงาน:
1. ระบุเฉพาะ entities ที่สำคัญ เช่น คอนเซ็ปต์, เทคโนโลยี, เครื่องมือ, วิธีการ
2. หา relationships ระหว่าง entities (เช่น USES, PROVIDES, REQUIRES, IS_A, HAS_FEATURE)
3. ใช้ชื่อ entities และ relationships ที่กระชับและชัดเจน
4. ตอบเป็น JSON เท่านั้น ไม่ต้องอธิบาย

รูปแบบ JSON ที่ต้องการ:
{
  "entities": ["Entity1", "Entity2", "Entity3"],
  "relationships": [
    {"from": "Entity1", "relation": "USES", "to": "Entity2"},
    {"from": "Entity2", "relation": "PROVIDES", "to": "Entity3"}
  ]
}`;

  const prompt = `วิเคราะห์ข้อความนี้และสร้าง knowledge graph:

"${textChunk}"

ตอบเป็น JSON เท่านั้น:`;

  try {
    const completion = await llmClient.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const responseText =
      completion.choices[0]?.message?.content?.trim() || "{}";

    // Try to extract JSON from response
    let jsonText = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);
    const entities: string[] = parsed.entities || [];
    const relationshipQueries: string[] = [];

    for (const rel of parsed.relationships || []) {
      if (rel.from && rel.to && rel.relation) {
        const query =
          `MERGE (a:Entity {name: '${rel.from.replace(/'/g, "\\'")}'})` +
          ` MERGE (b:Entity {name: '${rel.to.replace(/'/g, "\\'")}'})` +
          ` MERGE (a)-[:${rel.relation
            .toUpperCase()
            .replace(/[^A-Z_]/g, "_")}]->(b)`;
        relationshipQueries.push(query);
      }
    }

    console.log(
      `  > Extracted: ${entities.length} entities, ${relationshipQueries.length} relationships`
    );
    return { entities, relationships: relationshipQueries };
  } catch (error) {
    console.error("  > Error extracting graph:", error);
    return { entities: [], relationships: [] };
  }
}

/**
 * Takes text chunks and builds a knowledge graph in Neo4j.
 * @param chunks An array of text chunks.
 */
export async function buildGraphFromChunks(chunks: string[]): Promise<void> {
  console.log("\n[+] Starting graph building process...");
  console.log(`  > Processing ${chunks.length} chunks...`);

  const driver = getDriver();
  const session = driver.session({ database: "neo4j" });

  try {
    // Create a constraint for unique entities to avoid duplicates
    await session.run(
      "CREATE CONSTRAINT unique_entity IF NOT EXISTS FOR (n:Entity) REQUIRE n.name IS UNIQUE"
    );

    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const DELAY_MS = 500; // Delay between batches

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(
        `  > Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          chunks.length / BATCH_SIZE
        )}...`
      );

      const graphPromises = batch.map((chunk) => extractGraphFromChunk(chunk));
      const graphs = await Promise.all(graphPromises);

      // Store all relationships from this batch
      for (const graph of graphs) {
        for (const rel of graph.relationships) {
          try {
            await session.run(rel);
          } catch (error) {
            console.error("  > Error executing relationship query:", error);
          }
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }
    console.log(`[=] Graph building process complete.`);
  } catch (error) {
    console.error("[-] Error building graph:", error);
  } finally {
    await session.close();
  }
}

/**
 * Extract entities from question using LLM
 */
async function extractEntitiesFromQuestion(
  question: string
): Promise<string[]> {
  const useOllama = process.env.USE_OLLAMA === "true";
  const openaiConfig = useOllama
    ? { baseURL: "http://ollama:11434/v1", apiKey: "ollama" }
    : { apiKey, baseURL: "https://api.deepseek.com/v1" };

  const model = useOllama ? "llama3" : "deepseek-chat";
  const llmClient = new OpenAI(openaiConfig);

  const systemPrompt = `คุณเป็นผู้เชี่ยวชาญในการระบุ entities หลักจากคำถาม

งานของคุณ: หา entities (คอนเซ็ปต์, เทคโนโลยี, เครื่องมือ) ที่อยู่ในคำถาม

กฎการทำงาน:
1. ระบุเฉพาะ entities ที่สำคัญและชัดเจน
2. ใช้ชื่อที่กระชับ (1-3 คำ)
3. ตอบเป็น JSON array เท่านั้น

ตัวอย่าง:
คำถาม: "How do I use Cron in Elysia?"
ตอบ: ["Cron", "Elysia"]

คำถาม: "What is Redis used for?"
ตอบ: ["Redis"]`;

  try {
    const completion = await llmClient.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `คำถาม: "${question}"\n\nตอบเป็น JSON array:`,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const responseText =
      completion.choices[0]?.message?.content?.trim() || "[]";
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : "[]";

    const entities = JSON.parse(jsonText);
    return Array.isArray(entities)
      ? entities.filter((e: any) => typeof e === "string")
      : [];
  } catch (error) {
    console.error("  > Error extracting entities from question:", error);
    return [];
  }
}

/**
 * Queries the graph for entities related to the user's question.
 * @param question The user's question.
 * @returns A string of context from the graph.
 */
export async function queryGraph(question: string): Promise<string> {
  console.log("\n[+] Querying knowledge graph...");

  // Use LLM to extract entities from question
  const questionEntities = await extractEntitiesFromQuestion(question);

  if (questionEntities.length === 0) {
    console.log(
      "  > No relevant entities found in the question for graph query."
    );
    return "";
  }
  console.log(`  > Found entities in question: ${questionEntities.join(", ")}`);

  const driver = getDriver();
  const session = driver.session({ database: "neo4j" });
  let context = "";

  try {
    const result = await session.run(
      `
            MATCH (e:Entity)-[r]-(neighbor)
            WHERE e.name IN $entities
            RETURN e.name AS entity, type(r) AS relation, neighbor.name AS neighbor
            LIMIT 10
            `,
      { entities: questionEntities }
    );

    const triples = result.records.map(
      (record: any) =>
        `(${record.get("entity")})-[${record.get("relation")}]->(${record.get(
          "neighbor"
        )})`
    );

    if (triples.length > 0) {
      context = `Graph context: \n` + triples.join("\n");
      console.log(`  > Retrieved context from graph:\n${context}`);
    } else {
      console.log("  > No context found in graph for the given entities.");
    }
  } catch (error) {
    console.error("[-] Error querying graph:", error);
  } finally {
    await session.close();
  }

  return context;
}
