# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a YC Mentor AI application built with OpenAI's Agent SDK. It provides startup founders with personalized mentorship through specialized AI agents that handle business growth, fundraising, VC fund formation, and founder profiling.

**Critical product goal:** ship a mobile-first experience that mirrors the admin console (chat, command options, PDF upload, send) with a native iOS/Android feel. The `client/` app must stay simple, readable, safe-area aware, and use Tailwind + shadcn-style primitives to look like a polished mobile app. Web is secondary; treat mobile as the default target when implementing UI or workflow changes.

The system uses a multi-agent architecture with:
- **Router agent**: Routes questions to appropriate specialist mentors
- **Business & Growth mentor**: Advises on MVPs, user acquisition, product development
- **Fundraising mentor**: Provides fundraising strategy and market positioning
- **Vehicle mentor**: Guides VC fund formation, LP strategy, fund structures
- **Profiler agent**: Builds and maintains founder profiles over time
- **Research agent**: Performs web research using Tavily API
- **Synthesizer agent**: Combines specialist outputs into unified responses

## Development Commands

### Running the Application

- `npm run dev` or `npm start` - Run the console interface (terminal-based YC mentor)
- `npm run api` - Start the Express API server (port 4000)
- `npm run client` - Start the Vite dev server for web UI (port 5173)
- `npm run mobile` - Start Vite with mobile config
- `npm run web` - Run both API and client concurrently

### Building

- `npm run build:web` - Build the web client to `dist-web/`
- `npm run build:mobile` - Build mobile variant

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` - OpenAI API key for agent runtime
- `YC_MENTOR_FILE_ID` - OpenAI file ID for the uploaded mentor guide (see `docs/yc_mentor_guide.md`)
- `MEM0_API_KEY` - Mem0 API key for long-term memory persistence
- `TAVILY_API_KEY` - Tavily API key for web search capabilities
- `USER_ID` (optional) - User identifier for memory isolation (defaults to "demo_user")
- `YC_MENTOR_VECTOR_STORE_ID` (optional) - Reuse an existing vector store instead of creating daily

## Architecture

### Agent Workflow ([src/core/workflow.ts](src/core/workflow.ts))

The workflow runs through these stages for each user question:

1. **Initialization**: Vector store setup for File Search (cached daily in `.cache/yc_vector_store.json`)
2. **Long-term memory refresh**: Pull recent memories from Mem0
3. **Research phase** (conditional): If keywords like "search", "lookup", "blog" are detected, run research agent
4. **Router decision**: Determine which specialist mentors to invoke
5. **Profiler update**: Update founder profile based on the question
6. **Specialist execution**: Run selected mentors sequentially (biz → fund → vehicle)
7. **Synthesis**: Combine outputs into a unified YC-style response
8. **Memory persistence**: Store conversation in Mem0 with metadata

### Prompt System ([src/core/prompts.ts](src/core/prompts.ts))

Prompts are dynamically constructed from:
- Base templates defined in `buildDefaultPrompts()`
- Optional overrides in `config/prompts.overrides.json`
- Context injection (mentor guide summary)

Prompt keys: `profile`, `router`, `biz`, `fund`, `vehicle`, `synth`, `research`

Use `getAllPrompts()` to retrieve all prompts, `setPrompt(key, value)` to override.

### Server API ([src/server.ts](src/server.ts))

Express server with:
- `GET /api/health` - Health check
- `GET /api/stream?question=...` - SSE stream for workflow execution
- `GET /api/prompts` - Retrieve all agent prompts
- `PUT /api/prompts/:id` - Update a specific agent prompt
- `POST /api/files/pdf` - Upload PDF, index in vector store, return summary

PDF uploads are deduplicated by SHA-256 hash and cached in `.cache/pdf_index.json`.

### Console Interface ([src/ycMentorConsole.ts](src/ycMentorConsole.ts))

Interactive readline-based CLI with:
- Slash commands: `/help`, `/quiet` (toggle verbose output)
- Tab completion for slash commands
- Colored output per agent label

### Web Client

React + Vite + Tailwind CSS app in `web/` (note: `vite.config.ts` uses `root: "web"`):
- **UI components**: Located in `client/src/components/`
- **Custom hook**: `useChat.ts` manages SSE streaming from `/api/stream`
- **Multi-tab interface**: Dashboard, Ideas, Build, Founder, Challenge, Console
- **PDF upload**: `PdfUploadSheet.tsx` component
- **Command palette**: `CommandSheet.tsx` for inserting prompt templates

Build output: `dist-web/` (served by API server in production)

### State Management

- **Founder profile**: JSON object incrementally updated throughout conversation
- **Long-term memories**: Array of strings synced with Mem0 (limit: 50)
- **Idea backlog**: List of founder idea leads (limit: 20)
- **Research sources**: URLs from web searches (limit: 20)
- **Conversation session**: OpenAI Conversations API session (cached per user in `.cache/conversation_<user_id>.json`)

### Caching Strategy

Files in `.cache/`:
- `yc_vector_store.json` - Vector store ID + date (refreshed daily)
- `conversation_<user_id>.json` - Conversation session ID (persists across runs)
- `pdf_index.json` - Uploaded PDF metadata (hash, fileId, vectorStoreId, summary, name)

Temporary uploads: `.tmpuploads/` (cleaned after ingestion)

## Key Patterns

### Agent Streaming

All agents use streaming with `run(agent, input, { stream: true, workflowName, session })`. Event types:
- `response_started`, `response_done`
- `step_started`
- `tool_started`, `tool_completed`
- `output_text_delta` - incremental text chunks
- `raw_model_stream_event` - low-level events including reasoning tokens
- `error`

### JSON Block Extraction

Agents return structured data in fenced code blocks:
```json MARKER_NAME
{ ... }
```

Use `extractJsonBlock(text, "MARKER_NAME")` to parse. Examples:
- `FOUNDER_PROFILE` - Profiler output
- `ROUTER_PLAN` - Router decision
- `SUMMARY` - Business mentor summary
- `RESEARCH_NOTES` - Research agent findings

### Error Recovery

If a conversation session is missing (404), the workflow automatically resets the session and retries once.

### Tools

Agents have access to:
- `webSearchTool()` - OpenAI web search
- `fileSearchTool(vectorStoreId)` - File search over vector store
- `tavilySearchTool` - Custom Tavily web search (defined in [workflow.ts:428](src/core/workflow.ts:428))

## Color & Logging

Each agent label has a color scheme (see `labelStyles` in [workflow.ts:68](src/core/workflow.ts:68)):
- `profile` - green
- `biz` - cyan
- `fund` - magenta
- `vehicle` - blue
- `router` - yellow
- `synth` - white
- `research` - bright blue
- `pdf` - bright cyan

Quiet mode suppresses verbose output but still shows final synthesized response.

## Workflow Queuing

The server serializes workflow executions using `enqueueRun()` to prevent concurrent runs from interfering with shared state.

## Conversation Session Management

Uses OpenAI Conversations API:
- `getOrCreateConversationId()` - Load from cache or create new
- `ensureConversationSession()` - Lazy initialization
- `resetConversationSession()` - Clear cache and create fresh session

## Mobile vs Web

Two separate Vite configs:
- `vite.config.ts` - Web build (root: `web/`, output: `dist-web/`)
- `vite.mobile.config.ts` - Mobile build (root: `client/`, output: `dist/`)

Both use React + Tailwind, but mobile config may include PWA plugins.

## Testing Workflow Changes

When modifying agent behavior:
1. Update prompts in [src/core/prompts.ts](src/core/prompts.ts) or use API to override
2. Test with `npm run dev` in console mode
3. Use `/quiet` to reduce noise and focus on final output
4. Check `.cache/` files if vector store or conversation state seems stale
5. Verify JSON extraction for structured outputs

## Common Gotchas

- Vector store is cached per day; delete `.cache/yc_vector_store.json` to force re-indexing
- Conversation sessions persist across runs; delete `.cache/conversation_*.json` to reset chat history
- The `YC_MENTOR_FILE_ID` must be uploaded to OpenAI Files with `purpose: "assistants"` before running
- PDF uploads require `.tmpuploads/` directory (auto-created)
- Server stdout/stderr capturing in SSE mode uses process.stdout.write patching
