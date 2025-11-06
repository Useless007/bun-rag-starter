// First import the chunker you want from Chonkie
import { RecursiveChunker } from "@chonkiejs/core";

// Create a chunker
const chunker = await RecursiveChunker.create({
  chunkSize: 512,
  minCharactersPerChunk: 24,
});

// Chunk your text
const chunks = await chunker.chunk(
  "Woah! Chonkie, the chunking library is so cool!"
);

// Use the chunks
for (const chunk of chunks) {
  console.log(chunk.text);
  console.log(`Tokens: ${chunk.tokenCount}`);
}