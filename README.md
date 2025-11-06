# Graph RAG Project with Docker, Redis, Neo4j, and Ollama

This project demonstrates a cutting-edge Graph Retrieval-Augmented Generation (Graph RAG) pipeline. It leverages a powerful combination of technologies, containerized with Docker for seamless setup and deployment.

## Features

- **Graph RAG**: Goes beyond simple semantic search by constructing a Knowledge Graph to understand the relationships between entities in the source document, leading to more accurate and context-aware answers.
- **Fully Dockerized**: All components (app, Redis, Neo4j, and optional Ollama) are managed via Docker Compose.
- **Hybrid Context Retrieval**:
  - **Knowledge Graph (Neo4j)**: Extracts and stores entities and their relationships, providing structured, explicit context.
  - **Vector Store (Redis)**: Stores vector embeddings of text chunks for efficient semantic similarity search, providing unstructured, implicit context.
- **LLM Caching (Redis)**: Caches final answers to reduce latency and API costs.
- **Flexible LLM Backend**: Easily switch between the DeepSeek API and a local [Ollama](https://ollama.ai/) instance.
- **Local Embeddings**: Uses `@xenova/transformers` to generate embeddings locally, eliminating the need for an external embedding API.

## Architecture

The process is divided into two main phases: Indexing and Retrieval.

1.  **Indexing Phase (Building Knowledge)**:
    - **Chunking**: The source document is split into smaller, manageable text chunks.
    - **Vector Embedding**: Each chunk is converted into a numerical vector representation using a local embedding model. These embeddings are stored in **Redis Search**.
    - **Graph Creation**: Simultaneously, an LLM (currently placeholder logic) extracts key **entities** (like 'Elysia', 'Redis') and their **relationships** (like 'USES', 'IS_A') from the chunks. This structured knowledge is then used to build a Knowledge Graph in **Neo4j**.

2.  **Retrieval & Generation Phase (Answering Questions)**:
    - **Hybrid Querying**: When a user asks a question:
        1.  **Graph Query**: The system first queries the **Neo4j Knowledge Graph** to find any directly related entities and relationships, providing a structured context.
        2.  **Vector Search**: The question is converted into an embedding, which is used to find the most semantically similar text chunks from the **Redis vector store**.
    - **Context Augmentation**: The context from both the graph and the vector search are combined.
    - **LLM Prompting**: This rich, combined context is passed to the configured LLM (DeepSeek or Ollama) along with the original question to generate a comprehensive answer.
    - **Caching**: The final answer is cached in Redis.

## Prerequisites

- Docker and Docker Compose
- Bun (for local development if not using Docker)
- A DeepSeek API key (if not using Ollama)

## How to Run with Docker (Recommended)

1.  **Create a `.env` file**:
    Copy the `.env.example` file to `.env` and add your DeepSeek API key.
    ```bash
    cp .env.example .env
    ```
    Your `.env` file should look like this:
    ```.env
    DEEPSEEK_API_KEY=your_deepseek_api_key_here
    ```

2.  **Build and Run the Services**:
    This command will start the application, Redis, and Neo4j containers.
    ```bash
    docker-compose up --build
    ```
    The script will automatically perform the full indexing and querying pipeline. After the initial run, you can access the Neo4j Browser at `http://localhost:7474` to visualize the knowledge graph.

## Enabling Ollama (Optional)

If you want to run the RAG pipeline with a local LLM:

1.  **Install Ollama**: Make sure you have Ollama installed and running on your host machine.

2.  **Pull a Model**:
    Pull the model you want to use (e.g., `llama3`).
    ```bash
    ollama pull llama3
    ```

3.  **Uncomment the Ollama service**:
    In your `docker-compose.yml` file, uncomment the `ollama` service definition.

4.  **Set the Environment Variable**:
    In your `docker-compose.yml`, add the `USE_OLLAMA` environment variable to the `app` service:
    ```yaml
    services:
      app:
        # ... other settings
        environment:
          - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
          - REDIS_HOST=redis
          - REDIS_PORT=6379
          - USE_OLLAMA=true # <-- Add this line
    ```

5.  **Restart the Docker containers**:
    ```bash
    docker-compose up --build
    ```
    The application will now connect to the Ollama container for LLM inference instead of the DeepSeek API.

## Project Structure

```
.
├── docs/                 # Contains the source documents
│   └── llms-full.txt
├── .env.example          # Example environment file
├── Dockerfile            # Defines the application container
├── docker-compose.yml    # Orchestrates all services (app, redis, neo4j, ollama)
├── deepseek-example.ts   # The main RAG application logic
├── redis-client.ts       # Manages the Redis connection
├── graph-builder.ts      # Manages Neo4j connection and graph construction
├── package.json          # Project dependencies
└── README.md             # This file
```
