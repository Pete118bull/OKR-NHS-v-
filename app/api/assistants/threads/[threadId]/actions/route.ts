import { openai } from "@/app/openai";
import { NextRequest } from "next/server";
import { SubmitToolOutputsParams } from "openai/resources/beta/threads/runs/runs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { threadId, runId, toolCallOutputs } = body;

  const params: SubmitToolOutputsParams = {
    tool_outputs: toolCallOutputs
  };

  const stream = await openai.beta.threads.runs.submitToolOutputs(
    threadId,
    runId,
    params
  );

  return new Response(stream.toReadableStream());
}
