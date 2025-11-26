/*
 * Flow: PDF Summary Flow
 * 
 * [Upload] -> [PDF Summary Agent] -> [Summary Text]
 */

import { createPdfSummaryAgent } from "../agents/pdfSummaryAgent.js";
import { runAgentWithStreaming } from "../runner.js";

function buildPdfSummaryInput(fileName: string): string {
  return [
    "A new PDF has been uploaded to the knowledge base.",
    `File name: ${fileName}`,
    "",
    "Task:",
    "- Use File Search to read this PDF.",
    "- Provide 3–5 short bullets summarizing the document's purpose, key sections, and any stats or frameworks that YC mentors should know.",
    "- Mention the publication date/year if visible.",
    "- If the PDF cannot be read, state that clearly and suggest checking the upload."
  ].join("\n");
}

export async function summarizePdfUpload(fileName: string): Promise<string> {
  const pdfSummaryAgent = await createPdfSummaryAgent();
  const input = buildPdfSummaryInput(fileName);
  // Use a default user ID for system tasks
  const { fullText } = await runAgentWithStreaming(pdfSummaryAgent, input, "pdf", "default_user");
  return fullText.trim();
}

