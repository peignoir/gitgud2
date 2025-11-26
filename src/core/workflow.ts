import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import "dotenv/config";

import { initializePrompts } from "./prompts.js";
import { getVectorStoreId, resolveVectorStoreId } from "./tools/fileSearch.js";
import { summarizePdfUpload } from "./flows/pdfFlow.js";
import { resetUserData } from "./state/reset.js";
import { setQuietMode, isQuietMode } from "./state/config.js";

import { runConsoleFlow } from "./flows/consoleFlow.js";
import { runProfileFlow } from "./flows/profileFlow.js";
import { runIdeationFlow } from "./flows/ideationFlow.js";
import { runSprintFlow } from "./flows/sprintFlow.js";
import { runVibeceleratorFlow } from "./flows/vibeceleratorFlow.js";

const cwd = process.cwd();
const mentorGuidePath = path.resolve(cwd, "docs", "yc_mentor_guide.md");

const SLASH_COMMANDS = ["/help", "/quiet"];

function summarizeGuide(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const maxLength = 600;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

export async function initializeWorkflow(): Promise<void> {
  // Read mentor guide
  let mentorGuideText: string;
  try {
    if (!fs.existsSync(mentorGuidePath)) {
       console.error(`Unable to read mentor guide at ${mentorGuidePath}. Ensure the file exists.`);
       // Fallback or exit? Original code exits.
       // We can allow continuing without guide for some flows, but prompts rely on summary.
       mentorGuideText = "";
    } else {
       mentorGuideText = fs.readFileSync(mentorGuidePath, "utf8");
    }
  } catch (error) {
    console.error(`Error reading mentor guide:`, error);
    mentorGuideText = "";
  }

  const mentorGuideSummary = summarizeGuide(mentorGuideText);
  initializePrompts({ mentorGuideSummary });

  // Resolve vector store
  await resolveVectorStoreId();
}

export async function runWorkflow(question: string, userId: string = "default_user") {
  // Legacy entry point for console app
  await runConsoleFlow(userId, question);
}

export async function handleStepRequest(stepId: string, question: string, userId: string) {
  switch (stepId) {
    case "flow_profile":
      await runProfileFlow(userId, question);
      break;
    case "flow_ideation":
      await runIdeationFlow(userId, question);
      break;
    case "flow_sprint":
      await runSprintFlow(userId, question);
      break;
    case "flow_vibecelerator":
      await runVibeceleratorFlow(userId, question);
      break;
    case "flow_console":
    default:
      await runConsoleFlow(userId, question);
      break;
  }
}

function printHelp() {
  console.log("");
  console.log("Slash commands:");
  console.log("/help   - Show this message");
  console.log("/quiet  - Toggle quiet mode (currently " + (isQuietMode() ? "ON" : "OFF") + ")");
  console.log("Tip: type '/' then press Tab to autocomplete available commands.");
  console.log("");
}

function handleSlashCommand(line: string): boolean {
  const [commandRaw] = line.trim().split(/\s+/, 1);
  const command = commandRaw.toLowerCase();

  switch (command) {
    case "/help":
      printHelp();
      return true;
    case "/quiet":
      setQuietMode(!isQuietMode());
      console.log(`Quiet mode ${isQuietMode() ? "enabled" : "disabled"}.`);
      return true;
    case "/":
    case "":
      printHelp();
      return true;
    default:
      console.log(`Unknown command "${line}". Type /help for available commands.`);
      return true;
  }
}

export function processSlashCommand(line: string): boolean {
  return handleSlashCommand(line);
}

export function slashCompleter(line: string): [string[], string] {
  if (!line.startsWith("/")) {
    return [[], line];
  }

  const hits = SLASH_COMMANDS.filter((cmd) => cmd.startsWith(line));
  return [hits.length > 0 ? hits : SLASH_COMMANDS, line];
}

export {
  getVectorStoreId,
  summarizePdfUpload,
  resetUserData
};
