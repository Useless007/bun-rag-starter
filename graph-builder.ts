import 'dotenv/config';
import neo4j from 'neo4j-driver';
import OpenAI from 'openai';

// --- CONFIGURATION ---
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const apiKey = process.env.DEEPSEEK_API_KEY; // Re-using DeepSeek API key for now

// --- NEO4J DRIVER ---
let driver: neo4j.Driver;

function getDriver(): neo4j.Driver {
    if (!driver) {
        driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
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
 * A simple placeholder for extracting entities and relationships.
 * In a real-world scenario, you would use a powerful LLM with specific prompting
 * to get a structured JSON output.
 * @param textChunk The text to process.
 * @returns A promise that resolves to a simplified graph structure.
 */
async function extractGraphFromChunk(textChunk: string): Promise<{ entities: string[], relationships: string[] }> {
    // This is a placeholder. For a real implementation, you would use LangChain
    // or a direct LLM call to extract a structured graph.
    // For now, let's just pretend we found some entities and relationships.
    console.log(`  > (Placeholder) Extracting graph from chunk: "${textChunk.substring(0, 50)}..."`);
    // Example: "Elysia uses Cron." -> Entities: [Elysia, Cron], Relationship: [Elysia, USES, Cron]
    // We will simulate this extraction.
    const entities = new Set<string>();
    const relationships = new Set<string>();

    if (textChunk.toLowerCase().includes('elysia') && textChunk.toLowerCase().includes('cron')) {
        entities.add('Elysia');
        entities.add('Cron');
        relationships.add("MERGE (e:Entity {name: 'Elysia'}) MERGE (c:Entity {name: 'Cron'}) MERGE (e)-[:USES]->(c)");
    }
    if (textChunk.toLowerCase().includes('redis') && textChunk.toLowerCase().includes('cache')) {
        entities.add('Redis');
        entities.add('Cache');
        relationships.add("MERGE (r:Entity {name: 'Redis'}) MERGE (c:Entity {name: 'Cache'}) MERGE (r)-[:USED_AS]->(c)");
    }

    return { entities: Array.from(entities), relationships: Array.from(relationships) };
}

/**
 * Takes text chunks and builds a knowledge graph in Neo4j.
 * @param chunks An array of text chunks.
 */
export async function buildGraphFromChunks(chunks: string[]): Promise<void> {
    console.log('\n[+] Starting graph building process...');
    const driver = getDriver();
    const session = driver.session({ database: 'neo4j' });

    try {
        // Create a constraint for unique entities to avoid duplicates
        await session.run("CREATE CONSTRAINT unique_entity IF NOT EXISTS FOR (n:Entity) REQUIRE n.name IS UNIQUE");

        for (const chunk of chunks) {
            const graph = await extractGraphFromChunk(chunk);

            for (const rel of graph.relationships) {
                await session.run(rel);
            }
        }
        console.log(`[=] Graph building process complete.`);

    } catch (error) {
        console.error('[-] Error building graph:', error);
    } finally {
        await session.close();
    }
}

/**
 * Queries the graph for entities related to the user's question.
 * @param question The user's question.
 * @returns A string of context from the graph.
 */
export async function queryGraph(question: string): Promise<string> {
    console.log('\n[+] Querying knowledge graph...');
    // Simple entity extraction from the question
    const questionEntities = ['Elysia', 'Cron', 'Redis', 'Cache'].filter(e => question.toLowerCase().includes(e.toLowerCase()));

    if (questionEntities.length === 0) {
        console.log('  > No relevant entities found in the question for graph query.');
        return "";
    }
     console.log(`  > Found entities in question: ${questionEntities.join(', ')}`);

    const driver = getDriver();
    const session = driver.session({ database: 'neo4j' });
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

        const triples = result.records.map(record => `(${record.get('entity')})-[${record.get('relation')}]->(${record.get('neighbor')})`);

        if(triples.length > 0) {
            context = `Graph context: \n` + triples.join('\n');
            console.log(`  > Retrieved context from graph:\n${context}`);
        } else {
            console.log('  > No context found in graph for the given entities.');
        }

    } catch (error) {
        console.error('[-] Error querying graph:', error);
    } finally {
        await session.close();
    }

    return context;
}
