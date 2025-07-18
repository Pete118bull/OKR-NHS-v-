// Create a new thread
import { openai } from "@/app/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const thread = await openai.beta.threads.create();
    return NextResponse.json({ threadId: thread.id });
  } catch (error: any) {
    console.error("Failed to create thread:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
