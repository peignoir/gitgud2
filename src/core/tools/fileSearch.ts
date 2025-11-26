import { fileSearchTool } from "@openai/agents-openai";
import { openai } from "../state/openai.js";
import { loadCachedVectorStoreId, saveCachedVectorStoreId } from "../state/memory.js";
import "dotenv/config";

const mentorFileId = process.env.YC_MENTOR_FILE_ID;

if (!mentorFileId) {
  console.error("Missing YC_MENTOR_FILE_ID. Set it to the uploaded mentor guide file id.");
  process.exit(1);
}

const mentorGuideFileId = mentorFileId!;
let resolvedVectorStoreId: string | null = null;

export async function resolveVectorStoreId(): Promise<string> {
  if (resolvedVectorStoreId) {
    return resolvedVectorStoreId;
  }
  const existingVectorStoreId = process.env.YC_MENTOR_VECTOR_STORE_ID?.trim();
  if (existingVectorStoreId) {
    resolvedVectorStoreId = existingVectorStoreId;
    return existingVectorStoreId;
  }

  const cachedId = loadCachedVectorStoreId();
  if (cachedId) {
    resolvedVectorStoreId = cachedId;
    return cachedId;
  }

  console.log("Indexing YC mentor guide for File Search...");
  const vectorStore = await openai.vectorStores.create({
    name: `yc-mentor-guide-${Date.now()}`
  });

  const batch = await openai.vectorStores.fileBatches.create(vectorStore.id, {
    file_ids: [mentorGuideFileId]
  });

  const finalBatch = await openai.vectorStores.fileBatches.poll(vectorStore.id, batch.id);

  if (finalBatch.status !== "completed") {
    throw new Error(`Vector store ingestion did not complete successfully (status: ${finalBatch.status}).`);
  }

  if ((finalBatch.file_counts?.failed ?? 0) > 0) {
    throw new Error("Vector store ingestion failed for the mentor guide file.");
  }

  console.log(
    `Vector store ready (${vectorStore.id}). Set YC_MENTOR_VECTOR_STORE_ID to reuse it next run.`
  );
  saveCachedVectorStoreId(vectorStore.id);
  resolvedVectorStoreId = vectorStore.id;

  return vectorStore.id;
}

export async function getVectorStoreId(): Promise<string> {
  return resolveVectorStoreId();
}

export async function createFileSearchTool() {
  const vectorStoreId = await resolveVectorStoreId();
  // The tool description is handled internally by the SDK, but for our own clarity:
  // "A tool to search through uploaded files (YC Mentor Guide) using semantic search."
  return fileSearchTool(vectorStoreId);
}
