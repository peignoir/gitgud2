type WriteCallback = (err?: Error | null | undefined) => void;
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fsp } from "node:fs";

import express from "express";
import type { Request } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import { File } from "node:buffer";
import { createHash } from "node:crypto";

(globalThis as any).File ||= File;

import {
  initializeWorkflow,
  processSlashCommand,
  getVectorStoreId,
  summarizePdfUpload,
  resetUserData,
  handleStepRequest
} from "./core/workflow.js";
import { getAllPrompts, PromptKey, setPrompt } from "./core/prompts.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../dist-web");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});
const TMP_UPLOAD_DIR = path.resolve(process.cwd(), ".tmpuploads");
const PDF_INDEX_PATH = path.resolve(process.cwd(), ".cache/pdf_index.json");
type StoredPdf = {
  hash: string;
  fileId: string;
  vectorStoreId: string;
  summary: string;
  name: string;
};

function ensurePdfIndexDir() {
  fs.mkdirSync(path.dirname(PDF_INDEX_PATH), { recursive: true });
}

function loadPdfIndex(): StoredPdf[] {
  try {
    ensurePdfIndexDir();
    if (!fs.existsSync(PDF_INDEX_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(PDF_INDEX_PATH, "utf8");
    return JSON.parse(raw) as StoredPdf[];
  } catch {
    return [];
  }
}

function savePdfIndex(entries: StoredPdf[]) {
  ensurePdfIndexDir();
  fs.writeFileSync(PDF_INDEX_PATH, JSON.stringify(entries, null, 2), "utf8");
}

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required.");
}

let workflowQueue: Promise<void> = Promise.resolve();

function enqueueRun(task: () => Promise<void>): Promise<void> {
  const next = workflowQueue.then(task, task);
  workflowQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function chunkToString(chunk: any, encoding?: BufferEncoding): string {
  if (typeof chunk === "string") {
    return chunk;
  }
  return Buffer.isBuffer(chunk) ? chunk.toString(encoding) : String(chunk);
}

async function captureOutput(executor: () => Promise<void>, onChunk: (chunk: string) => void) {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  const stdoutPatched: typeof process.stdout.write = (chunk, encoding?, cb?) => {
    const actualEncoding = typeof encoding === "function" ? undefined : encoding;
    const callbackFromEncoding = typeof encoding === "function" ? (encoding as WriteCallback) : undefined;
    const callbackFromCb = typeof cb === "function" ? (cb as WriteCallback) : undefined;
    const actualCallback: WriteCallback | undefined = callbackFromEncoding ?? callbackFromCb;
    onChunk(chunkToString(chunk, actualEncoding));
    return originalStdoutWrite(chunk, actualEncoding as BufferEncoding | undefined, actualCallback);
  };
  

  const stderrPatched: typeof process.stderr.write = (chunk, encoding?, cb?) => {
    const actualEncoding = typeof encoding === "function" ? undefined : encoding;
    const callbackFromEncoding = typeof encoding === "function" ? (encoding as WriteCallback) : undefined;
    const callbackFromCb = typeof cb === "function" ? (cb as WriteCallback) : undefined;
    const actualCallback: WriteCallback | undefined = callbackFromEncoding ?? callbackFromCb;
    onChunk(chunkToString(chunk, actualEncoding));
    return originalStderrWrite(chunk, actualEncoding as BufferEncoding | undefined, actualCallback);
  };

  process.stdout.write = stdoutPatched;
  process.stderr.write = stderrPatched;

  try {
    await executor();
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/stream", async (req, res) => {
  const rawQuestion = (req.query.question as string | undefined) ?? "";
  // Support both header (ideal) and query param (for EventSource limitation)
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string) || "default_user";
  const stepId = (req.query.step as string | undefined) || "flow_console";
  const question = rawQuestion.trim();

  if (!question) {
    res.status(400).json({ error: "question query parameter is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  enqueueRun(async () => {
    await initializeWorkflow();
    await captureOutput(
      async () => {
        if (question.startsWith("/")) {
          processSlashCommand(question);
        } else {
          await handleStepRequest(stepId, question, userId);
        }
      },
      (chunk) => send("chunk", { chunk })
    );
    send("done", { success: true });
    res.write(`event: done\ndata: {"success":true}\n\n`);
    res.end();
  }).catch((error: unknown) => {
    console.error("[API Error]", error);
    const message = error instanceof Error ? error.message : String(error);
    send("error", { message });
    res.end();
  });
});

const PROMPT_KEYS: PromptKey[] = ["profile", "router", "biz", "fund", "vehicle", "synth", "research"];
const isPromptKey = (value: string): value is PromptKey => PROMPT_KEYS.includes(value as PromptKey);

app.get("/api/prompts", (_req, res) => {
  try {
    res.json(getAllPrompts());
  } catch (error) {
    res.status(500).json({ error: "Prompts are not initialized." });
  }
});

app.put("/api/prompts/:id", (req, res) => {
  const promptId = req.params.id;
  if (!isPromptKey(promptId)) {
    res.status(400).json({ error: "Unknown agent prompt." });
    return;
  }
  const nextPrompt = typeof req.body?.prompt === "string" ? req.body.prompt : null;
  if (!nextPrompt) {
    res.status(400).json({ error: "Prompt text is required." });
    return;
  }
  try {
    const updated = setPrompt(promptId, nextPrompt);
    res.json({ prompt: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update prompt." });
  }
});

// app.post("/api/profile", async (req, res) => {
//   const userId = req.headers["x-user-id"] as string | undefined;
//   if (!userId) {
//     res.status(400).json({ error: "Missing x-user-id header" });
//     return;
//   }
//   try {
//     await initializeWorkflow();
//     // const updatedProfile = await applyManualProfileUpdate(userId, req.body?.profile ?? {});
//     // res.json({ profile: updatedProfile });
//     res.status(501).json({ error: "Not implemented yet" });
//   } catch (error) {
//     const message = error instanceof Error ? error.message : "Failed to update profile.";
//     res.status(400).json({ error: message });
//   }
// });

type FileUploadRequest = Request & { file?: Express.Multer.File };

app.post("/api/reset", async (req, res) => {
  const userId = (req.headers["x-user-id"] as string | undefined);
  if (!userId) {
    res.status(400).json({ error: "Missing x-user-id header" });
    return;
  }
  try {
    const result = await resetUserData(userId);
    res.json({ 
      success: true, 
      message: `Reset complete! Cleared ${result.memoriesCleared} memories and all profile data.`,
      memoriesCleared: result.memoriesCleared
    });
  } catch (error) {
    console.error("Reset failed:", error);
    res.status(500).json({ error: "Failed to reset user data." });
  }
});

app.post("/api/files/pdf", upload.single("file"), async (req, res) => {
  const file = (req as FileUploadRequest).file;
  if (!file) {
    res.status(400).json({ error: "Missing file upload." });
    return;
  }
  if (file.mimetype !== "application/pdf") {
    res.status(400).json({ error: "Only PDF files are supported." });
    return;
  }
  console.log("[PDF Upload] Received file:", file.originalname, file.size);
  const pdfIndex = loadPdfIndex();
  const fileHash = hashBuffer(file.buffer);
  const existing = pdfIndex.find((entry) => entry.hash === fileHash);
  if (existing) {
    console.log("[PDF Upload] Duplicate detected, skipping upload.");
    res.json({
      ok: true,
      duplicate: true,
      fileId: existing.fileId,
      vectorStoreId: existing.vectorStoreId,
      summary: existing.summary
    });
    return;
  }
  let tmpPath: string | null = null;
  try {
    await initializeWorkflow();
    await fsp.mkdir(TMP_UPLOAD_DIR, { recursive: true });
    const safeName = file.originalname.replace(/\s+/g, "-");
    tmpPath = path.join(TMP_UPLOAD_DIR, `${Date.now()}-${safeName}`);
    await fsp.writeFile(tmpPath, file.buffer);

    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(tmpPath),
      purpose: "assistants"
    });
    console.log("[PDF Upload] File uploaded to OpenAI:", uploadedFile.id);

    const vectorStoreId = await getVectorStoreId();
    const batch = await openai.vectorStores.fileBatches.create(vectorStoreId, {
      file_ids: [uploadedFile.id]
    });
    const finalBatch = await openai.vectorStores.fileBatches.poll(vectorStoreId, batch.id);
    if (finalBatch.status !== "completed") {
      throw new Error(`Vector store ingestion failed: ${finalBatch.status}`);
    }

    const summary = await summarizePdfUpload(file.originalname);

    const updatedIndex: StoredPdf[] = [
      { hash: fileHash, name: file.originalname, fileId: uploadedFile.id, vectorStoreId, summary },
      ...pdfIndex
    ];
    savePdfIndex(updatedIndex.slice(0, 50));

    res.json({
      ok: true,
      fileId: uploadedFile.id,
      vectorStoreId,
      summary
    });
  } catch (error) {
    console.error("PDF upload failed:", error);
    const message = error instanceof Error ? error.message : "Failed to upload and index PDF.";
    res.status(500).json({ error: message });
  } finally {
    if (tmpPath) {
      try {
        await fsp.unlink(tmpPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

