"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MailOpen, Paperclip, X, Star, Reply, ReplyAll, Forward } from "lucide-react";

interface Email {
  id: string;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string;
  ccAddresses: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  isRead: boolean;
  isStarred: boolean;
  sentAt: string;
  attachments: { id: string; filename: string; size: number }[];
  threadId: string | null;
}

interface EmailViewProps {
  emailId: string | null;
  onReply: (email: Email, type: "reply" | "replyAll" | "forward") => void;
  onClose: () => void;
  impersonating?: boolean;
}

function getInitials(name: string | null, email: string) {
  const src = name || email;
  return src.split(/\s|@/)[0].slice(0, 2).toUpperCase();
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

export default function EmailView({ emailId, onReply, onClose, impersonating }: EmailViewProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [senderAvatar, setSenderAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId) { setEmail(null); setSenderAvatar(null); return; }
    setLoading(true);
    fetch(`/api/emails/${emailId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setEmail(d);
          // Fetch sender avatar
          fetch(`/api/profile/avatars?emails=${encodeURIComponent(d.fromAddress.toLowerCase())}`)
            .then(r => r.json())
            .then(map => setSenderAvatar(map[d.fromAddress.toLowerCase()] || null))
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [emailId]);

  /* ── Empty State ── */
  if (!emailId) {
    return (
      <div className="email-view-panel" style={{ background: "transparent" }}>
        <div className="email-view-empty">
          <div style={{ opacity: 0.18, transform: "scale(2.5)", marginBottom: 12 }}><MailOpen size={32} /></div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              No message selected
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Choose an email from the list to read it
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (loading || !email) {
    return (
      <div className="email-view-panel">
        <div className="email-view-header" style={{ padding: "24px 28px 18px" }}>
          <div className="skeleton" style={{ height: 26, width: "65%", marginBottom: 22, borderRadius: 8 }} />
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 14, width: "25%", marginBottom: 9, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 6 }} />
            </div>
            <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ padding: "20px 28px" }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  let toAddrs: string[] = [];
  try { toAddrs = JSON.parse(email.toAddresses); } catch {}

  return (
    <div className="email-view-panel">
      {/* Header */}
      <div className="email-view-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
          <h2 className="email-view-subject">{email.subject || "(no subject)"}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            title="Close"
            style={{ flexShrink: 0, marginTop: 2 }}
          ><X size={16} /></button>
        </div>

        <div className="email-meta">
          <div
            className="email-meta-avatar"
            style={senderAvatar ? { overflow: "hidden" } : { background: stringToColor(email.fromAddress) }}
          >
            {senderAvatar ? (
              <img src={senderAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              getInitials(email.fromName, email.fromAddress)
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div className="email-meta-from">
                {email.fromName || email.fromAddress.split("@")[0]}
              </div>
              <div className="email-meta-time">
                {format(new Date(email.sentAt), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
            <div className="email-meta-addr">&lt;{email.fromAddress}&gt;</div>
            {toAddrs.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                To: {toAddrs.join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {!impersonating && (
        <div className="email-toolbar">
          <button className="toolbar-btn" onClick={() => onReply(email, "reply")}>
            <Reply size={14} />
            Reply
          </button>
          <button className="toolbar-btn" onClick={() => onReply(email, "replyAll")}>
            <ReplyAll size={14} />
            Reply All
          </button>
          <button className="toolbar-btn" onClick={() => onReply(email, "forward")}>
            <Forward size={14} />
            Forward
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Star */}
          <button
            className={`toolbar-btn ${email.isStarred ? "starred" : ""}`}
            style={{ color: email.isStarred ? "var(--warning)" : undefined }}
            onClick={async () => {
              await fetch(`/api/emails/${email.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isStarred: !email.isStarred }),
              });
              setEmail(prev => prev ? { ...prev, isStarred: !prev.isStarred } : prev);
            }}
          >
            <Star size={14} fill={email.isStarred ? "currentColor" : "none"} /> {email.isStarred ? "Starred" : "Star"}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="email-body">
        {/* Attachments */}
        {email.attachments?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {email.attachments.map(att => (
              <div key={att.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "var(--glass-blur)",
                borderRadius: 12,
                boxShadow: "var(--glass-shadow)",
              }}>
                <Paperclip size={20} />
                <div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {att.filename}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {formatSize(att.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        {email.bodyHtml ? (
          <div
            className="email-body-content"
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        ) : (
          <div className="email-body-content" style={{ whiteSpace: "pre-wrap" }}>
            {email.bodyText || "(empty message)"}
          </div>
        )}
      </div>
    </div>
  );
}
