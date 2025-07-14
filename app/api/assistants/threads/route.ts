import { NextResponse } from "next/server";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

export async function POST() {
  try {
    const thread = await openai.beta.threads.create();
    return NextResponse.json({ threadId: thread.id });  // ✅ Ensure correct format
  } catch (error: any) {
    console.error("Failed to create thread:", error);
    return NextResponse.json(
      { error: error.message || "Thread creation failed." },
      { status: 500 }
    );
  }
}

