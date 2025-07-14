// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

// 1) Quick GET to verify the route exists
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // 2) Pull file & threadId out of the FormData
  const formData = await req.formData();
  const file = formData.get("file") as Blob | null;
  const threadId = formData.get("threadId") as string | null;

  if (!file || !threadId) {
    return NextResponse.json(
      { error: "Missing file or thread ID." },
      { status: 400 }
    );
  }

  // 3) Read the file into a Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4) Extract text depending on MIME type
  let text = "";
  const mime = (file as any).type;
  try {
    if (mime === "application/pdf") {
      const data = await pdf(buffer);
      text = data.text;
    } else if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      text = value;
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${mime}` },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("File parsing error:", err);
    return NextResponse.json(
      { error: "Failed to parse file: " + err.message },
      { status: 500 }
    );
  }

  // 5) Forward the extracted text into the chat messages route
  try {
    const chatRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [], 
          content:
            "📄 I’ve uploaded a file. Please read the following content and provide insights:\n\n" +
            text,
        }),
      }
    );

    let chatJson;
    try {
      chatJson = await chatRes.json();
    } catch {
      const bodyText = await chatRes.text();
      console.error("Non-JSON response from chat:", bodyText);
      return NextResponse.json(
        { error: "Failed to parse assistant response." },
        { status: 500 }
      );
    }

    if (!chatRes.ok) {
      console.error("Assistant reply error:", chatJson);
      return NextResponse.json(
        { error: chatJson.error || "Failed to get assistant response." },
        { status: chatRes.status }
      );
    }

    return NextResponse.json({
      reply: chatJson.reply,
      filePreview: text.slice(0, 1000),
    });
  } catch (err: any) {
    console.error("Chat forwarding error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to forward file to assistant." },
      { status: 500 }
    );
  }
}


