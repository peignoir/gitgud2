import readline from "node:readline";
import process from "node:process";

import {
  initializeWorkflow,
  runWorkflow,
  processSlashCommand,
  slashCompleter
} from "./core/workflow";

async function main() {
  console.log("YC Mentor Workflow – ask your startup question (Ctrl+C to exit)");
  await initializeWorkflow();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: slashCompleter,
    prompt: "Founder: "
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const question = line.trim();
    if (!question) {
      console.log("Please enter a question or press Ctrl+C to exit.");
      rl.prompt();
      return;
    }

    if (question.startsWith("/")) {
      processSlashCommand(question);
      rl.prompt();
      return;
    }

    try {
      await runWorkflow(question);
    } catch (error) {
      console.error("Workflow run failed:", error);
    } finally {
      rl.prompt();
    }
  });

  rl.on("close", () => {
    console.log("Exiting YC Mentor Workflow.");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

