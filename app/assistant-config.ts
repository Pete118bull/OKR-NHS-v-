let assistantId = process.env.OPENAI_ASSISTANT_ID;

if (!assistantId) {
  throw new Error("OPENAI_ASSISTANT_ID environment variable is not set.");
}

export { assistantId };
