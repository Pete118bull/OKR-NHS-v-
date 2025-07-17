const envAssistantId = process.env.OPENAI_ASSISTANT_ID;

if (!envAssistantId) {
  throw new Error("Missing OPENAI_ASSISTANT_ID environment variable");
}

export const assistantId: string = envAssistantId;
