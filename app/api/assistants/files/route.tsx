import { openai } from "@/app/openai";
import { NextRequest } from "next/server";

// Upload file and return file ID
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file") as File;

  if (!file) return new Response("Missing file", { status: 400 });

  const openaiFile = await openai.files.create({
    file,
    purpose: "assistants",
  });

  return new Response(JSON.stringify({ fileId: openaiFile.id }), { status: 200 });
}
