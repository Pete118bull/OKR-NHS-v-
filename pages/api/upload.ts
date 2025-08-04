// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File } from "formidable";
import fs from "fs";
import pdf from "pdf-parse";
import mammoth from "mammoth";

// Disable Next’s default body parser so formidable can parse multipart
export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Parse form data
  let fields: Record<string, string | string[]>;
  let files: Record<string, File | File[]>;
  try {
    const result = await new Promise<{
      fields: Record<string, string | string[]>;
      files: Record<string, File | File[]>;
    }>((resolve, reject) => {
      new IncomingForm().parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });
    fields = result.fields;
    files = result.files;
  } catch (err: any) {
    console.error("Form parsing error:", err);
    return res
      .status(500)
      .json({ error: "Failed to parse form data: " + err.message });
  }

  // 2) Normalize the file
  let fileField = files.file;
  if (Array.isArray(fileField)) fileField = fileField[0];
  if (!fileField) {
    return res.status(400).json({ error: "Missing file field" });
  }

  // 3) Normalize the threadId
  let rawTid = fields.threadId;
  if (!rawTid) {
    return res.status(400).json({ error: "Missing threadId field" });
  }
  if (Array.isArray(rawTid)) rawTid = rawTid[0];
  const threadId = rawTid;
  if (typeof threadId !== "string" || !threadId.startsWith("thread_")) {
    return res.status(400).json({ error: "Invalid threadId" });
  }

  // 4) Normalize history
  let rawHist = fields.history;
  if (!rawHist) {
    return res.status(400).json({ error: "Missing history field" });
  }
  if (Array.isArray(rawHist)) rawHist = rawHist[0];
  let history: Array<{ role: string; text: string }>;
  try {
    history = JSON.parse(rawHist as string);
    if (!Array.isArray(history)) throw new Error();
  } catch {
    return res.status(400).json({ error: "Invalid history JSON" });
  }

  // 5) Read file into buffer
  const tempPath = (fileField as any).filepath || (fileField as any).path;
  if (typeof tempPath !== "string") {
    return res.status(500).json({ error: "Unable to locate uploaded file" });
  }
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(tempPath);
  } catch (err: any) {
    console.error("Read error:", err);
    return res.status(500).json({ error: "Failed to read file: " + err.message });
  }

  // 6) Extract text
  let text = "";
  try {
    if (fileField.mimetype === "application/pdf") {
      text = (await pdf(buffer)).text;
    } else if (
      fileField.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = (await mammoth.extractRawText({ buffer })).value;
    } else {
      return res
        .status(400)
       .json({ error: `Unsupported file type: ${fileField.mimetype}` });
    }
  } catch (err: any) {
    console.error("Extract error:", err);
    return res.status(500).json({ error: "Failed to extract text." });
  }

  // 7) Forward full history + file content into chat endpoint
  try {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/assistants/threads/${threadId}/messages`;
    console.log("📤 Forwarding to chat:", url);
    console.log("📤 Sending payload:", {
      historyLength: history.length,
      textSnippet: text.slice(0, 300),
    });

    const chatRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history,
        content: "📄 I’ve uploaded a file. Please read and provide insights:\n\n" + text,
      }),
    });

    const raw = await chatRes.text();
    console.log("📥 Raw assistant response (as text):", raw);

    let chatJson;
    try {
      chatJson = JSON.parse(raw);
    } catch (parseErr) {
      console.error("❌ JSON parse failed:", parseErr);
      return res.status(500).json({
        error: "Received malformed response from assistant.",
      });
    }

    console.log("📥 Parsed JSON:", chatJson);

    if (!chatRes.ok) {
      return res.status(chatRes.status).json({
        error: chatJson.error || "Assistant error.",
      });
    }

    return res.status(200).json({
      reply: chatJson.reply,
      filePreview: text.slice(0, 1000),
    });
  } catch (err: any) {
    console.error("❌ Forward error:", err);
    return res.status(500).json({ error: "Failed to forward to assistant." });
  }
}