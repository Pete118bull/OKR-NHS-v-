import { openai } from "@/app/openai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { threadId, runId, toolCallOutputs } = body;

  const stream = await openai.beta.threads.runs.submitToolOutputs(
    threadId,
    runId,
    {
      tool_outputs: toolCallOutputs,
    } as any // ← bypass type mismatch here
  );

  return new Response(stream.toReadableStream());
}
