
# Gemini Project Context: RAG Pipeline Demo

## Project Overview

This project is a TypeScript application built on the Bun runtime. Its primary purpose is to demonstrate a complete Retrieval-Augmented Generation (RAG) pipeline from scratch. The main script, `deepseek-example.ts`, reads a local text document, processes it, and uses an external Large Language Model (LLM) to answer questions about its content.

### Key Technologies

*   **Runtime**: Bun
*   **Language**: TypeScript
*   **Text Chunking**: `chonkie` is used to split large documents into smaller, manageable chunks.
*   **Embeddings**: `@xenova/transformers` generates vector embeddings for text chunks locally, enabling semantic search.
*   **LLM Integration**: The `openai` library is used as a client to interact with the OpenAI-compatible DeepSeek API for the final answer generation step.
*   **Configuration**: `dotenv` is used for managing secrets (API keys).

### Architecture

The RAG pipeline implemented in `deepseek-example.ts` follows these steps:
1.  **Load Document**: Reads a specified text file from the `docs/` directory.
2.  **Chunk**: Splits the document text into smaller chunks using `chonkie`.
3.  **Embed**: Generates a vector embedding for each chunk and for the user's question using a local model via `@xenova/transformers`.
4.  **Retrieve**: Performs a cosine similarity search to find the most semantically relevant chunk(s) from the document to answer the question.
5.  **Augment & Generate**: Sends the relevant chunk(s) as context along with the original question to the DeepSeek API and receives a generated answer.

## Building and Running

### 1. Installation

Install all necessary dependencies using Bun:

```bash
bun install
```

### 2. Setup API Key

This project requires an API key from DeepSeek. Create a `.env` file in the root of the project and add your key:

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### 3. Running the Main Application

The core logic is in `deepseek-example.ts`. To run the full RAG pipeline, execute the following command:

```bash
bun run deepseek-example.ts
```

**Note**: The first time you run the script, it will download the embedding model (`Xenova/all-MiniLM-L6-v2`), which may take a few moments.

## Development Conventions

*   **Secrets**: All secret keys (like `DEEPSEEK_API_KEY`) must be stored in a `.env` file. The `.gitignore` file is configured to ignore `.env` files, preventing secrets from being committed to version control.
*   **Configuration**: The main configurable parameters, such as the document to read (`documentFilename`) and the question to ask (`userQuestion`), are located at the top of the `deepseek-example.ts` file for easy modification.
*   **Modularity**: The embedding model is managed via a singleton class (`EmbeddingPipeline`) to ensure it is loaded into memory only once, which is an important performance consideration.
