"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { toast } from "sonner";

interface ComposeModalProps {
  onClose: () => void;
  onSent: () => void;
  replyTo?: {
    type: "reply" | "replyAll" | "forward";
    email: any;
  } | null;
}

export default function ComposeModal({ onClose, onSent, replyTo }: ComposeModalProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (replyTo) {
      if (replyTo.type === "reply") {
        setTo(replyTo.email.fromAddress);
        setSubject(`Re: ${replyTo.email.subject}`);
      } else if (replyTo.type === "replyAll") {
        const allAddrs = [
          ...JSON.parse(replyTo.email.toAddresses),
          replyTo.email.fromAddress,
          ...JSON.parse(replyTo.email.ccAddresses || "[]"),
        ];
        setTo(allAddrs.join(", "));
        setSubject(`Re: ${replyTo.email.subject}`);
      } else if (replyTo.type === "forward") {
        setSubject(`Fwd: ${replyTo.email.subject}`);
      }
    }
  }, [replyTo]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your message here…" }),
    ],
    content: replyTo && replyTo.type === "forward"
      ? `<br/><br/><blockquote>---------- Forwarded message ---------<br/>From: ${replyTo.email.fromAddress}<br/>Date: ${replyTo.email.sentAt}<br/>Subject: ${replyTo.email.subject}<br/><br/>${replyTo.email.bodyHtml || replyTo.email.bodyText}</blockquote>`
      : replyTo
        ? `<br/><br/><blockquote>On ${replyTo.email.sentAt}, ${replyTo.email.fromAddress} wrote:<br/>${replyTo.email.bodyHtml || replyTo.email.bodyText}</blockquote>`
        : "",
  });

  async function handleSend() {
    if (!to.trim()) return toast.error("Please specify at least one recipient");
    if (!editor) return;

    setSending(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.split(",").map(e => e.trim()).filter(Boolean),
          subject: subject || "(no subject)",
          bodyHtml: editor.getHTML(),
          bodyText: editor.getText(),
          replyToMessageId: replyTo?.email.messageId,
          threadId: replyTo?.email.threadId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("✅ Message sent successfully!");
      onSent();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      setSending(false);
    }
  }

  const modalTitle = replyTo?.type === "reply" ? "Reply"
    : replyTo?.type === "replyAll" ? "Reply All"
    : replyTo?.type === "forward" ? "Forward"
    : "New Message";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="compose-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15 }}>
              {replyTo?.type === "reply" || replyTo?.type === "replyAll" ? "↩️" :
               replyTo?.type === "forward" ? "↪️" : "✏️"}
            </span>
            <span>{modalTitle}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="icon-btn"
              style={{ padding: "4px 8px", fontSize: 12, color: "var(--text-muted)" }}
              onClick={onClose}
              title="Minimize"
            >
              −
            </button>
            <button
              className="icon-btn danger"
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={onClose}
              title="Discard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* To field */}
        <div className="compose-field">
          <label>To</label>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com, another@example.com"
            autoFocus
          />
        </div>

        {/* Subject field */}
        <div className="compose-field compose-subject">
          <label>Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
          />
        </div>

        {/* Tiptap editor */}
        <div className="compose-editor">
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>

        {/* Footer */}
        <div className="compose-footer">
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span>
                Sending…
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="icon-btn" title="Attach file (coming soon)" style={{ fontSize: 15 }}>📎</button>
            <button className="icon-btn" title="Emoji (coming soon)" style={{ fontSize: 15 }}>😊</button>
            <button className="icon-btn danger" onClick={onClose} title="Discard draft" style={{ fontSize: 15 }}>🗑️</button>
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .tiptap-editor blockquote {
            border-left: 3px solid var(--border-strong);
            padding-left: 14px;
            margin: 8px 0;
            color: var(--text-muted);
            font-style: italic;
          }
        `}</style>
      </div>
    </div>
  );
}
