import process from "node:process";
import { Agent, run } from "@openai/agents";
import { AgentLabel } from "./state/userState.js";
import { isQuietMode } from "./state/config.js";
import { 
  ensureConversationSession, 
  resetConversationSession, 
  isConversationMissingError
} from "./state/conversation.js";
import { getUserState } from "./state/userState.js";

export const colorize = (code: string) => (text: string) => `\u001b[${code}m${text}\u001b[0m`;

export const labelStyles: Record<
  AgentLabel,
  { tag: string; answer: (text: string) => string; thinking: (text: string) => string; heading: (text: string) => string }
> = {
  profile: {
    tag: colorize("1;32")("[profile]"),
    answer: colorize("32"),
    thinking: colorize("2;32"),
    heading: colorize("1;32")
  },
  biz: {
    tag: colorize("1;36")("[biz]"),
    answer: colorize("36"),
    thinking: colorize("2;36"),
    heading: colorize("1;36")
  },
  fund: {
    tag: colorize("1;35")("[fund]"),
    answer: colorize("35"),
    thinking: colorize("2;35"),
    heading: colorize("1;35")
  },
  vehicle: {
    tag: colorize("1;34")("[vehicle]"),
    answer: colorize("34"),
    thinking: colorize("2;34"),
    heading: colorize("1;34")
  },
  router: {
    tag: colorize("1;33")("[router]"),
    answer: colorize("33"),
    thinking: colorize("2;33"),
    heading: colorize("1;33")
  },
  synth: {
    tag: colorize("1;37")("[mentor]"),
    answer: colorize("37"),
    thinking: colorize("2;37"),
    heading: colorize("1;37")
  },
  research: {
    tag: colorize("1;94")("[research]"),
    answer: colorize("94"),
    thinking: colorize("2;94"),
    heading: colorize("1;94")
  },
  pdf: {
    tag: colorize("1;96")("[pdf]"),
    answer: colorize("96"),
    thinking: colorize("2;96"),
    heading: colorize("1;96")
  },
  ideation: {
    tag: colorize("1;95")("[idea]"),
    answer: colorize("95"),
    thinking: colorize("2;95"),
    heading: colorize("1;95")
  },
  sprint: {
    tag: colorize("1;91")("[sprint]"),
    answer: colorize("91"),
    thinking: colorize("2;91"),
    heading: colorize("1;91")
  },
  vibecelerator: {
    tag: colorize("1;93")("[vibe]"),
    answer: colorize("93"),
    thinking: colorize("2;93"),
    heading: colorize("1;93")
  }
};

export const routerInfoColor = colorize("38;5;208");
export const gray = colorize("90");
export const errorColor = colorize("31");

export function formatLabel(label: AgentLabel): string {
  return labelStyles[label]?.tag ?? `[${label}]`;
}

export function colorAnswer(label: AgentLabel, text: string): string {
  return labelStyles[label]?.answer(text) ?? text;
}

export function colorThinking(label: AgentLabel, text: string): string {
  return labelStyles[label]?.thinking(text) ?? text;
}

export function heading(label: AgentLabel, text: string): string {
  return labelStyles[label]?.heading(text) ?? text;
}

export function announceSection(label: AgentLabel, title: string) {
  if (isQuietMode()) {
    return;
  }
  console.log(heading(label, `\n=== ${title} ===\n`));
}

const spinnerFrames = ["|", "/", "-", "\\"];

function startSpinner(label: AgentLabel, text: string): NodeJS.Timeout | (() => void) {
  let frame = 0;
  if (!isQuietMode()) {
    console.log(`${formatLabel(label)} ${colorThinking(label, text)}`);
    return () => {};
  }

  process.stdout.write(`${formatLabel(label)} ${colorThinking(label, `${spinnerFrames[frame]} ${text}`)}`);
  return setInterval(() => {
    frame = (frame + 1) % spinnerFrames.length;
    process.stdout.write(`\r${formatLabel(label)} ${colorThinking(label, `${spinnerFrames[frame]} ${text}`)}`);
  }, 120);
}

function stopSpinner(timer: NodeJS.Timeout | (() => void)) {
  if (typeof timer === "function") {
    timer();
    return;
  }
  clearInterval(timer);
  if (isQuietMode()) {
    process.stdout.write("\r\x1b[K");
  }
}

function logReasoning(label: AgentLabel, data: Record<string, unknown>) {
  if (isQuietMode()) {
    return;
  }
  const rawContent = Array.isArray((data as any)?.rawContent)
    ? ((data as any).rawContent as Array<{ text?: string }>)
    : [];
  const structuredContent = Array.isArray((data as any)?.content)
    ? ((data as any).content as Array<{ text?: string }>)
    : [];

  const rawText = rawContent.map((item) => item.text ?? "").join(" ").trim();
  const structuredText = structuredContent.map((item) => item.text ?? "").join(" ").trim();
  const message = rawText || structuredText;

  const thinkingMessage = message ? `thinking: ${message}` : "thinking...";
  console.log(`${formatLabel(label)} ${colorThinking(label, thinkingMessage)}`);
}

async function getAgentStream(
  agent: Agent,
  input: string,
  label: AgentLabel,
  userId: string,
  attempt = 1
): Promise<AsyncIterable<any>> {
  await ensureConversationSession(userId, attempt > 1);
  const state = getUserState(userId);
  if (!state.conversationSession) {
    throw new Error("Conversation session is not initialized.");
  }
  try {
    return await run(agent, input, {
      stream: true,
      session: state.conversationSession
    });
  } catch (error) {
    if (attempt < 2 && isConversationMissingError(error)) {
      await resetConversationSession(userId);
      return getAgentStream(agent, input, label, userId, attempt + 1);
    }
    throw error;
  }
}

export async function runAgentWithStreaming(agent: Agent, input: string, label: AgentLabel, userId: string): Promise<{ fullText: string }> {
  const verbose = !isQuietMode();
  const streamAnswers = !isQuietMode();
  const spinner = startSpinner(label, "thinking...");

  const stream = await getAgentStream(agent, input, label, userId);
  let fullText = "";

  const handleTextDelta = (delta: string) => {
    fullText += delta;
    if (streamAnswers) {
      process.stdout.write(colorAnswer(label, delta));
    }
  };

  for await (const event of stream as AsyncIterable<any>) {
    switch (event.type) {
      case "response_started":
        if (verbose) {
          console.log(`${formatLabel(label)} ${colorThinking(label, "answer streaming...")}`);
        }
        break;
      case "response_done":
        if (verbose) {
          console.log(`${formatLabel(label)} ${colorThinking(label, "answer completed")}`);
        }
        break;
      case "step_started":
        if (verbose) {
          console.log(`${formatLabel(label)} ${gray(`step started: ${event.step?.name ?? "step"}`)}`);
        }
        break;
      case "tool_started":
        if (verbose) {
          console.log(`${formatLabel(label)} ${gray(`tool started: ${event.toolCall?.toolName ?? "tool"}`)}`);
        }
        break;
      case "tool_completed":
        if (verbose) {
          console.log(`${formatLabel(label)} ${gray(`tool completed: ${event.toolCall?.toolName ?? "tool"}`)}`);
        }
        break;
      case "output_text_delta":
        handleTextDelta(event.delta);
        break;
      case "raw_model_stream_event": {
        const data = event.data as Record<string, unknown> | undefined;
        if (!data) {
          break;
        }
        const dataType =
          typeof (data as { type?: string }).type === "string" ? (data as { type?: string }).type : undefined;

        if (dataType === "output_text_delta" && typeof (data as { delta?: string }).delta === "string") {
          handleTextDelta((data as { delta: string }).delta);
          break;
        }

        if (dataType === "reasoning" && verbose) {
          logReasoning(label, data);
        }
        break;
      }
      case "error":
        console.error(`${formatLabel(label)} ${errorColor(String(event.error))}`);
        break;
      default:
        break;
    }
  }

  stopSpinner(spinner);

  if (streamAnswers) {
    if (!fullText.endsWith("\n")) {
      process.stdout.write("\n");
    }
  } else {
    const trimmed = fullText.trim();
    if (trimmed && label === "synth") {
      console.log(`\n${trimmed}\n`);
    }
  }

  return { fullText };
}

