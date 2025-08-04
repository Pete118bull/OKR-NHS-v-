import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI(); // Uses OPENAI_API_KEY from environment

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const threadId = formData.get("threadId") as string;

    if (!file || !threadId) {
      return NextResponse.json({ error: "Missing file or threadId" }, { status: 400 });
    }

    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });

    // Add message to thread with the file
    await openai.beta.threads.messages.create(
      threadId,
      {
        role: "user",
        content: "Please review this document for OKRs.",
        file_ids: [uploadedFile.id],
      } as any
    );

    // Start a Run with explicit upload instructions
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: process.env.OKR_ASSISTANT_ID!,
        instructions: `
When a file is uploaded:
1. Read and analyse for outcome, impact, key steps, dependencies, and OKRs.
2. Begin your response with: “Thanks, it looks like you are trying to…” followed by a single-sentence summary of the document's purpose.
3. Then ask: “Would you like to review or refine this OKR together using the logic model and OKR framework?”
        `.trim(),
      }
    );

    // Poll for run to complete
    let runStatus = run.status;
    while (runStatus !== "completed" && runStatus !== "failed" && runStatus !== "cancelled") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const updatedRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = updatedRun.status;
    }

    if (runStatus !== "completed") {
      return NextResponse.json({ error: "Assistant run failed or was cancelled." }, { status: 500 });
    }

    // Get the latest assistant message
    const messageList = await openai.beta.threads.messages.list(threadId);
    const latestMessage = messageList.data.find((msg) => msg.role === "assistant");

    const reply =
      latestMessage?.content?.[0]?.type === "text"
        ? latestMessage.content[0].text.value
        : "[No assistant response found]";

    return NextResponse.json({
      thread_id: threadId,
      run_id: run.id,
      reply,
    });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}



