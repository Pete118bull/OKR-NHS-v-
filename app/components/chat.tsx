"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import Markdown from "react-markdown";

export type Role = "system" | "user" | "assistant" | "code";
export type MessageProps = { role: Role; text: string };

type ChatProps = {
  functionCallHandler?: (call: any) => Promise<string | undefined>;
};

const UserMessage = ({ text }: { text: string }) => (
  <div className={styles.userMessage}>{text}</div>
);
const AssistantMessage = ({ text }: { text: string }) => (
  <div className={styles.assistantMessage}>
    <Markdown>{text}</Markdown>
  </div>
);
const CodeMessage = ({ text }: { text: string }) => (
  <div className={styles.codeMessage}>
    {text.split("\n").map((line, i) => (
      <div key={i}>
        <span>{i + 1}. </span>
        {line}
      </div>
    ))}
  </div>
);

const Message = ({ role, text }: MessageProps) => {
  if (role === "user") return <UserMessage text={text} />;
  if (role === "assistant") return <AssistantMessage text={text} />;
  if (role === "code") return <CodeMessage text={text} />;
  return null;
};

export default function Chat({ functionCallHandler }: ChatProps) {
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [userInput, setUserInput] = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!threadId) return;
    setInputDisabled(true);
    setMessages((m) => [...m, { role: "user", text }]);

    try {
      const res = await fetch(`/api/assistants/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: messages, content: text }),
      });
      const { reply, error } = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: error ? `[Error] ${error}` : reply },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: "[Assistant error]" }]);
    } finally {
      setUserInput("");
      setInputDisabled(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = userInput.trim();
    if (t) sendMessage(t);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await fetch("/api/assistants/threads", { method: "POST" });
      const data = await res.json();
      const newThreadId = data.threadId;
      setThreadId(newThreadId);

      const newSystemMessage: MessageProps = {
        role: "system",
        text:
          "You are the OKR Assistant. When the user clicks “Let’s get started,” ask them to clarify:\n" +
          "• Review an existing OKR\n" +
          "• Develop a new OKR\n" +
          "• Ask a specific question about OKRs or logic modelling",
      };

      setMessages([newSystemMessage]);

      const form = new FormData();
      form.append("file", file);
      form.append("threadId", newThreadId);
      form.append("history", JSON.stringify([newSystemMessage]));

      setInputDisabled(true);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error(uploadData.error);

      setMessages((m) => [...m, { role: "assistant", text: uploadData.reply }]);
     
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `❌ Upload error: ${err.message}` },
      ]);
    } finally {
      setInputDisabled(false);
      e.target.value = "";
    }
  };

  const handleStart = async () => {
    try {
      const res = await fetch("/api/assistants/threads", { method: "POST" });
      const data = await res.json();
      const newThreadId = data.threadId;
      setThreadId(newThreadId);

      const newSystemMessage: MessageProps = {
        role: "system",
        text:
          "You are the OKR Assistant. When the user clicks “Let’s get started,” ask them to clarify:\n" +
          "• Review an existing OKR\n" +
          "• Develop a new OKR\n" +
          "• Ask a specific question about OKRs or logic modelling",
      };

      setMessages([newSystemMessage]);
      await sendMessage("Let's get started");
      setHasStarted(true);
    } catch (err) {
      console.error("Error starting conversation:", err);
    }
  };

  return (
    <div className={styles.chatContainer}>
      {!hasStarted && (
        <div className={styles.examplePrompts}>
          <button
            onClick={handleStart}
            disabled={inputDisabled}
            className={styles.promptButton}
          >
            Let’s get started
          </button>
        </div>
      )}

      <form className={styles.uploadForm}>
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={inputDisabled}
          className={styles.uploadInput}
        />
      </form>

      {hasStarted && (
        <div className={styles.messages}>
          {messages.map((m, i) =>
            m.role === "system" ? null : (
              <Message key={i} role={m.role} text={m.text} />
            )
          )}
          <div ref={endRef} />
        </div>
      )}

      {hasStarted && (
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={inputDisabled || !threadId}
            placeholder="Type your question…"
            className={styles.input}
          />
          <button
            type="submit"
            disabled={inputDisabled || !userInput.trim()}
            className={styles.button}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
