// Create a new thread
import { openai } from "@/app/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const thread = await openai.beta.threads.create();
    return NextResponse.json({ threadId: thread.id });
  } catch (error: any) {
    console.error("Failed to create thread:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
