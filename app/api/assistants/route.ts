import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI(); // Uses OPENAI_API_KEY from environment

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    // Upload file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });

    // Create new thread
    const thread = await openai.beta.threads.create();

    // Add user message referencing the file
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: "Please review this document for OKRs.",
        file_ids: [uploadedFile.id],
      } as any // workaround for TypeScript not recognizing 'file_ids'
    );

    // Start run with enforced OKR-specific file analysis instructions
    const run = await openai.beta.threads.runs.create({
      thread_id: thread.id,
      assistant_id: process.env.OKR_ASSISTANT_ID!, // must be defined in .env or Vercel
      instructions: `
When a file is uploaded:
1. Read and analyse for outcome, impact, key steps, dependencies, and OKRs.
2. Begin your response with: “Thanks, it looks like you are trying to…” followed by a single-sentence summary of the document's purpose.
3. Then ask: “Would you like to review or refine this OKR together using the logic model and OKR framework?”
      `.trim(),
    });

    return NextResponse.json({ thread_id: thread.id, run_id: run.id });
  } catch (error) {
    console.error("Upload or Assistant Run Error:", error);
    return NextResponse.json({ error: "Assistant failed to process file" }, { status: 500 });
  }
}

