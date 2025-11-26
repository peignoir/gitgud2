import OpenAI from "openai";
import { setDefaultOpenAIKey } from "@openai/agents-openai";
import "dotenv/config";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Please set it before running the workflow.");
  process.exit(1);
}

setDefaultOpenAIKey(apiKey);
export const openai = new OpenAI({ apiKey });

