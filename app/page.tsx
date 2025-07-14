"use client";

import Chat from "./components/chat"; // adjust if needed

export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>NHS OKR Assistant</h1>
      <p style={{ marginBottom: "1rem" }}>
        Start by asking a question or click "Let’s get started" below.
      </p>
      <Chat />
    </main>
  );
}

