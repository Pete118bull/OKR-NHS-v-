"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import Markdown from "react-markdown";

type Role = "system" | "user" | "assistant" | "code";
type MessageProps = { role: Role; text: string };

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

export default function Chat() {
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<MessageProps[]>([
    {
      role: "system",
      text:
        "You are the OKR Assistant. When the user clicks “Let’s get started,” ask them to clarify:\n" +
        "• Review an existing OKR\n" +
        "• Develop a new OKR\n" +
        "• Ask a specific question about OKRs or logic modelling",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1) Create thread
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/assistants/threads", { method: "POST" });
      const { threadId: newId } = await res.json();
      setThreadId(newId);
    })();
  }, []);

  // 2) Send a normal chat message
  const sendMessage = async (text: string) => {
    if (!threadId) return;
    setInputDisabled(true);
    setMessages((m) => [...m, { role: "user", text }]);

    try {
      const res = await fetch(
        `/api/assistants/threads/${threadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: messages, content: text }),
        }
      );
      const { reply, error } = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: error ? `[Error] ${error}` : reply },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "[Assistant error]" },
      ]);
    } finally {
      setUserInput("");
      setInputDisabled(false);
    }
  };

  // 3) Handle input submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = userInput.trim();
    if (t) sendMessage(t);
  };

  // 4) Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !threadId) return;

    const form = new FormData();
    form.append("file", file);
    form.append("threadId", threadId);
    form.append("history", JSON.stringify(messages));

    setInputDisabled(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      if (data.filePreview) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `Preview:\n${data.filePreview}` },
        ]);
      }
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

  return (
    <div className={styles.chatContainer}>
      {!hasStarted && (
        <div className={styles.examplePrompts}>
          <button
            onClick={() => {
              sendMessage("Let's get started");
              setHasStarted(true);
            }}
            disabled={inputDisabled || !threadId}
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
          disabled={inputDisabled || !threadId}
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
