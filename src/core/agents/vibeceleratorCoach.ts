import { Agent } from "@openai/agents";
import { webSearchTool } from "@openai/agents-openai";
import { createFileSearchTool } from "../tools/fileSearch.js";
import { getPrompt } from "../prompts.js";

export async function createVibeceleratorCoach(): Promise<Agent> {
  const filesTool = await createFileSearchTool();
  const web = webSearchTool();

  return new Agent({
    name: "9-Day Vibecelerator Coach",
    model: "gpt-5.1",
    tools: [web, filesTool],
    instructions: getPrompt("vibecelerator")
  });
}

