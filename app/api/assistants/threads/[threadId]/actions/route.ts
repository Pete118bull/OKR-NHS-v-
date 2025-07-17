import { openai } from "@/app/openai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { threadId, runId, toolCallOutputs } = body;

  const run = await openai.beta.threads.runs.submitToolOutputs(
    threadId,
    runId,
    {
      tool_outputs: toolCallOutputs,
    } as any
  );

  return Response.json(run); // ✅ return JSON, not a stream
}
