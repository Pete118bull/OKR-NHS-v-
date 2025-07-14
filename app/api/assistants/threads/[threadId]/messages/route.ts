// app/api/assistants/threads/[threadId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;
  if (!threadId.startsWith("thread_")) {
    return NextResponse.json(
      { error: `Invalid thread ID: "${threadId}"` },
      { status: 400 }
    );
  }

  let body: {
    history: Array<{ role: "system" | "user" | "assistant"; text: string }>;
    content: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Expected { history, content }." },
      { status: 400 }
    );
  }

  const { history, content } = body;
  if (
    !Array.isArray(history) ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Bad request body. Ensure history is an array and content is a non-empty string.",
      },
      { status: 400 }
    );
  }

  // Build messages for the model
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content: content.trim() },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      top_p: 0.9,
    });
    const reply =
      completion.choices?.[0]?.message?.content ??
      "[No reply from assistant]";
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat Completions error:", err);
    return NextResponse.json(
      { error: err.message || "Assistant processing failed." },
      { status: 500 }
    );
  }
}
