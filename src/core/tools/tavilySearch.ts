import { tool } from "@openai/agents";
import "dotenv/config";

const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
  console.error("Missing TAVILY_API_KEY. Please set it to enable Tavily search.");
  process.exit(1);
}

type TavilyParameters = {
  query: string;
  topic: string;
  maxResults: number;
  searchDepth: "basic" | "advanced";
  includeAnswer: boolean;
};

export const tavilySearchTool = tool({
  name: "tavily_search",
  description:
    "Use Tavily to search the public web for articles, blogs, LinkedIn profiles, and news. This tool provides summarized answers and lists of sources. Use this for broad information gathering and fact-checking.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        minLength: 4,
        description: "The search query. Be specific and include entity names, topics, or questions."
      },
      topic: {
        type: "string",
        description: "Optional high-level topic to provide context (e.g., 'fundraising', 'team background')."
      },
      maxResults: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "Number of search results to return. Default is 5."
      },
      searchDepth: {
        type: "string",
        enum: ["basic", "advanced"],
        default: "basic",
        description: "Depth of the search. 'basic' is faster; 'advanced' is more thorough."
      },
      includeAnswer: {
        type: "boolean",
        default: true,
        description: "Whether to include a synthesized answer from Tavily. Default is true."
      }
    },
    required: ["query", "topic", "maxResults", "searchDepth", "includeAnswer"],
    additionalProperties: false
  },
  async execute({ query, topic, maxResults, searchDepth, includeAnswer }: TavilyParameters) {
    const body = {
      api_key: tavilyApiKey,
      query: topic ? `${topic}: ${query}` : query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_answers: includeAnswer,
      include_images: false,
      include_raw_content: false
    };

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const lines: string[] = [];
    if (data.answer && includeAnswer) {
      lines.push(`Tavily summary: ${data.answer}`);
    }

    if (Array.isArray(data.results)) {
      data.results.slice(0, maxResults).forEach((result, index) => {
        const title = result.title ?? `Result ${index + 1}`;
        const url = result.url ?? "";
        const snippet = result.content?.slice(0, 280) ?? "";
        lines.push(`${index + 1}. ${title}\n${snippet}${url ? `\nSource: ${url}` : ""}`);
      });
    }

    return lines.join("\n\n") || "No Tavily results returned.";
  },
  errorFunction: (_context: unknown, error: unknown) =>
    `Tavily search failed: ${error instanceof Error ? error.message : String(error)}`
});
