import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { NextRequest } from "next/server";

// Upload file to assistant
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response("Missing file", { status: 400 });
  }

  const openaiFile = await openai.files.create({
    file,
    purpose: "assistants",
  });

  const assistant = await openai.beta.assistants.retrieve(assistantId);
  const existingFiles = assistant.file_ids || [];

  await openai.beta.assistants.update(assistantId, {
    file_ids: [...existingFiles, openaiFile.id],
  });

  return new Response(JSON.stringify({ fileId: openaiFile.id }), {
    status: 200,
  });
}

// List assistant files
export async function GET() {
  const assistant = await openai.beta.assistants.retrieve(assistantId);

  const files = await Promise.all(
    (assistant.file_ids || []).map(async (fileId) => {
      const file = await openai.files.retrieve(fileId);
      return {
        file_id: file.id,
        filename: file.filename,
      };
    })
  );

  return new Response(JSON.stringify(files), { status: 200 });
}

// Delete assistant file
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const fileId = body.fileId;

  if (!fileId) {
    return new Response("Missing fileId", { status: 400 });
  }

  const assistant = await openai.beta.assistants.retrieve(assistantId);
  const updatedFileIds = (assistant.file_ids || []).filter((id) => id !== fileId);

  await openai.beta.assistants.update(assistantId, {
    file_ids: updatedFileIds,
  });

  await openai.files.del(fileId);

  return new Response("File deleted", { status: 200 });
}
