"use client";

import Chat from "./components/chat"; // adjust if needed

export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>NHS OKR Assistant</h1>
      <p style={{ marginBottom: "1rem" }}>
        To get started, you can  press <strong>"Let’s get started"</strong> 
        <br />
        
        <br />
        <em>
          “Just to be clear, could you let me know what you'd like to do today?<br />
          – Review an existing OKR - upload or copy/paste below<br />
          – Develop a new OKR with my help<br />
          – Ask a specific question about OKRs or logic modelling?”
        </em>
      </p>
      <Chat />
    </main>
  );
}
