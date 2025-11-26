import { Agent } from "@openai/agents";
import { webSearchTool } from "@openai/agents-openai";
import { createFileSearchTool } from "../tools/fileSearch.js";

export async function createPdfSummaryAgent(): Promise<Agent> {
  const filesTool = await createFileSearchTool();
  const web = webSearchTool();

  return new Agent({
    name: "PDF Intake Sentinel",
    model: "gpt-5.1",
    tools: [filesTool, web],
    instructions: [
      "You summarize newly uploaded PDFs for the YC Mentor workflow.",
      "When prompted, assume the referenced PDF was just added to the shared vector store.",
      "Use File Search to read the PDF contents and produce a concise 3–5 bullet summary that confirms:",
      "- What the document is (title, topic, author if available).",
      "- Key sections or findings that matter for YC mentors.",
      "- Any data freshness (year) or notable caveats.",
      "If the PDF cannot be parsed, say so explicitly and suggest re-uploading.",
      "Keep the tone factual and under 120 words."
    ].join("\n")
  });
}

