import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { NextRequest } from "next/server";

// Upload file to assistant's vector store
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response("Missing file", { status: 400 });
  }

  const vectorStoreId = await getOrCreateVectorStore();

  // Upload file to OpenAI
  const openaiFile = await openai.files.create({
    file,
    purpose: "assistants",
  });

  // Attach to vector store
  await openai.beta.vectorStores.files.create({
    vectorStoreId,
    fileId: openaiFile.id,
  });

  return new Response(JSON.stringify({ fileId: openaiFile.id }), {
    status: 200,
  });
}

// List files in assistant's vector store
export async function GET() {
  const vectorStoreId = await getOrCreateVectorStore();

  const fileList = await openai.beta.vectorStores.files.list({
    vectorStoreId,
  });

  const filesArray = await Promise.all(
    fileList.data.map(async (file) => {
      const fileDetails = await openai.files.retrieve(file.id);
      const vectorDetails = await openai.beta.vectorStores.files.retrieve({
        vectorStoreId,
        fileId: file.id,
      });

      return {
        file_id: file.id,
        filename: fileDetails.filename,
        status: vectorDetails.status,
      };
    })
  );

  return new Response(JSON.stringify(filesArray), { status: 200 });
}

// Delete file from assistant's vector store
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const fileId = body.fileId;

  if (!fileId) {
    return new Response("Missing fileId", { status: 400 });
  }

  const vectorStoreId = await getOrCreateVectorStore();

  await openai.beta.vectorStores.files.del({
    vectorStoreId,
    fileId,
  });

  return new Response("File deleted", { status: 200 });
}

/* Helper to fetch or create vector store */
const getOrCreateVectorStore = async (): Promise<string> => {
  const assistant = await openai.beta.assistants.retrieve(assistantId);

  const existingId =
    assistant.tool_resources?.file_search?.vector_store_ids?.[0];

  if (existingId) return existingId;

  const vectorStore = await openai.beta.vectorStores.create({ name: "sample-assistant-vector-store" });

  await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });

  return vectorStore.id;
};
