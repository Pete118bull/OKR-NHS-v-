// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File } from "formidable";
import fs from "fs";
import pdf from "pdf-parse";
import mammoth from "mammoth";

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

  let fields: Record<string, string | string[]>;
  let files: Record<string, File | File[]>;
  try {
    const { fields: flds, files: fls } = await new Promise((resolve, reject) => {
      new IncomingForm().parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });
    fields = flds;
    files = fls;
  } catch (err: any) {
    console.error("Form parsing error:", err);
    return res.status(500).json({ error: "Failed to parse form data: " + err.message });
  }

  let fileField = files.file;
  if (Array.isArray(fileField)) fileField = fileField[0];
  if (!fileField) {
    return res.status(400).json({ error: "Missing file field" });
  }

  let rawTid = fields.threadId;
  if (!rawTid) {
    return res.status(400).json({ error: "Missing threadId field" });
  }
  if (Array.isArray(rawTid)) rawTid = rawTid[0];
  const threadId = rawTid;
  if (typeof threadId !== "string" || !threadId.startsWith("thread_")) {
    return res.status(400).json({ error: "Invalid threadId" });
  }

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
      return res.status(400).json({ error: `Unsupported file type: ${fileField.mimetype}` });
    }
  } catch (err: any) {
    console.error("Extract error:", err);
    return res.status(500).json({ error: "Failed to extract text." });
  }

  try {
    console.log("📤 Forwarding to chat:", { threadId, historyLength: history.length });

    const chatRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          content: "📄 I’ve uploaded a file. Please read and provide insights:\n\n" + text,
        }),
      }
    );

    let chatJson: any;
    try {
      chatJson = await chatRes.json();
    } catch {
      const rawText = await chatRes.text();
      console.error("Non-JSON response:", rawText);
      return res.status(500).json({ error: "Non-JSON response from assistant: " + rawText });
    }

    console.log("📥 Chat replied:", chatRes.status, chatJson);

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
    console.error("Forward error:", err);
    return res.status(500).json({ error: "Failed to forward to assistant." });
  }
}
