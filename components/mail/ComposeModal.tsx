"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CornerUpLeft, CornerUpRight, Forward, Edit2, Minus, X, Send as SendIcon, Paperclip, Smile, Trash2 } from "lucide-react";
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
            <span style={{ display: "flex", alignItems: "center" }}>
              {replyTo?.type === "reply" ? <CornerUpLeft size={16} /> :
               replyTo?.type === "replyAll" ? <CornerUpRight size={16} /> :
               replyTo?.type === "forward" ? <Forward size={16} /> : <Edit2 size={16} />}
            </span>
            <span>{modalTitle}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="icon-btn"
              style={{ padding: "4px 8px", color: "var(--text-muted)" }}
              onClick={onClose}
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              className="icon-btn danger"
              style={{ padding: "4px 8px" }}
              onClick={onClose}
              title="Discard"
            >
              <X size={14} />
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
                <SendIcon size={14} />
                Send
              </>
            )}
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="icon-btn" title="Attach file (coming soon)"><Paperclip size={16} /></button>
            <button className="icon-btn" title="Emoji (coming soon)"><Smile size={16} /></button>
            <button className="icon-btn danger" onClick={onClose} title="Discard draft"><Trash2 size={16} /></button>
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
