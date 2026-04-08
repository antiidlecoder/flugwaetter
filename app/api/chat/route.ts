import { streamText, stepCountIs, convertToModelMessages } from "ai";
// import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { getTodayZurich } from "@/lib/services/open-meteo";
import { tools } from "@/lib/tools";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages, { tools });

  const result = streamText({
    // model: anthropic("claude-sonnet-4-20250514"),
    model: openai("gpt-5.4"),
    system: buildSystemPrompt(getTodayZurich()),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
