import { Agent } from "@openai/agents";
import { webSearchTool } from "@openai/agents-openai";
import { tavilySearchTool } from "../tools/tavilySearch.js";
import { createFileSearchTool } from "../tools/fileSearch.js";
import { getPrompt } from "../prompts.js";

export async function createRouterAgent(): Promise<Agent> {
  const filesTool = await createFileSearchTool();
  const web = webSearchTool();

  return new Agent({
    name: "YC Router",
    model: "gpt-5.1",
    tools: [filesTool, web, tavilySearchTool],
    instructions: getPrompt("router")
  });
}

