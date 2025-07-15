// app/api/assistants/threads/[threadId]/messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/app/openai";
import { assistantId } from "@/app/assistant-config";

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;
  const { content } = await req.json();

  try {
    // 1. Add user message to thread
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content,
    });
    console.debug("Message created:", message.id);

    // 2. Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
    console.debug("Run object:", run);

    // 3. Poll for run completion
    let status = run.status;
    const runId = run.id;

    while (status !== "completed" && status !== "failed") {
      await new Promise((res) => setTimeout(res, 1000));

      const updatedRun = await openai.beta.threads.runs.retrieve(
        runId,
        { thread_id: threadId } // ✅ Correct param order
      );

      status = updatedRun.status;
      console.debug("Run status:", status);
    }

    if (status === "failed") {
      throw new Error("Assistant run failed.");
    }

    // 4. Retrieve last assistant message
    const messages = await openai.beta.threads.messages.list(threadId);
    const last = messages.data.find((m) => m.role === "assistant");

    return NextResponse.json({ reply: last?.content[0]?.text?.value || "" });

  } catch (err: any) {
    console.error("Error handling assistant message:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
