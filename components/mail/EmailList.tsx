"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Inbox, Send, FileText, Trash2, Star, Search, Paperclip, MailX } from "lucide-react";

interface Email {
  id: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  bodyText: string | null;
  isRead: boolean;
  isStarred: boolean;
  sentAt: string;
  attachments: { id: string }[];
}

interface EmailListProps {
  folder: string;
  selectedId: string | null;
  onSelect: (email: Email) => void;
  impersonateUserId?: string;
  refreshKey?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
  if (isYesterday(d)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
}

function getInitials(name: string | null, email: string) {
  const src = name || email;
  return src.split(/\s|@/)[0].slice(0, 2).toUpperCase();
}

// Generates a stable HSL color from a string
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

export default function EmailList({
  folder, selectedId, onSelect, impersonateUserId, refreshKey,
}: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ folder, page: String(page), limit: "30" });
    if (search) params.set("search", search);
    if (impersonateUserId) params.set("userId", impersonateUserId);
    const res = await fetch(`/api/emails?${params}`);
    const data = await res.json();
    const fetched: Email[] = data.emails || [];
    setEmails(fetched);
    setTotalPages(data.totalPages || 1);
    setTotalEmails(data.total || fetched.length || 0);
    setLoading(false);

    // Fetch avatars for unique sender addresses
    const uniqueEmails = [...new Set(fetched.map(e => e.fromAddress.toLowerCase()))];
    if (uniqueEmails.length > 0) {
      fetch(`/api/profile/avatars?emails=${encodeURIComponent(uniqueEmails.join(","))}`)
        .then(r => r.json())
        .then(map => setAvatarMap(prev => ({ ...prev, ...map })))
        .catch(() => {});
    }
  }, [folder, page, search, impersonateUserId, refreshKey]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  useEffect(() => {
    const iv = setInterval(fetchEmails, 30000);
    return () => clearInterval(iv);
  }, [fetchEmails]);

  async function toggleStar(e: React.MouseEvent, email: Email) {
    e.stopPropagation();
    await fetch(`/api/emails/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !email.isStarred }),
    });
    setEmails(prev => prev.map(em => em.id === email.id ? { ...em, isStarred: !em.isStarred } : em));
  }

  async function trashEmail(e: React.MouseEvent, email: Email) {
    e.stopPropagation();
    await fetch(`/api/emails/${email.id}`, { method: "DELETE" });
    setEmails(prev => prev.filter(em => em.id !== email.id));
  }

  const folderLabels: Record<string, string> = {
    INBOX: "Inbox", SENT: "Sent", DRAFT: "Drafts", TRASH: "Trash", STARRED: "Starred",
  };

  const folderIcons: Record<string, any> = {
    INBOX: <Inbox size={18} />, SENT: <Send size={18} />, DRAFT: <FileText size={18} />, TRASH: <Trash2 size={18} />, STARRED: <Star size={18} />,
  };

  return (
    <div className="email-list-panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center" }}>{folderIcons[folder] || <Inbox size={18} />}</span>
            <span className="panel-title">{folderLabels[folder] || folder}</span>
          </div>
          <div className="panel-subtitle">
            {loading ? "Loading…" : `${totalEmails} message${totalEmails !== 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Search className="search-icon" size={15} />
        <input
          id="email-search"
          type="text"
          placeholder="Search emails…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* List */}
      <div className="email-list">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="skeleton" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 12, flex: 1 }} />
                <div className="skeleton" style={{ height: 10, width: 40 }} />
              </div>
              <div className="skeleton" style={{ height: 11, width: "70%", marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 10, width: "90%" }} />
            </div>
          ))
        ) : emails.length === 0 ? (
          <div style={{
            padding: "60px 20px", textAlign: "center",
            color: "var(--text-muted)", fontSize: 13,
          }}>
            <div style={{ marginBottom: 12, opacity: 0.4, display: "flex", justifyContent: "center", transform: "scale(2.2)" }}>
              {folderIcons[folder] || <MailX size={18} />}
            </div>
            <div style={{ fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>
              No emails here
            </div>
            <div style={{ fontSize: 12 }}>
              {search ? "Try a different search term" : "You're all caught up!"}
            </div>
          </div>
        ) : emails.map(email => (
          <div
            key={email.id}
            id={`email-item-${email.id}`}
            className={`email-item ${!email.isRead ? "unread" : ""} ${selectedId === email.id ? "active" : ""}`}
            onClick={() => onSelect(email)}
          >
            <div className="email-item-top">
              <div className="email-sender-row">
                <div
                  className="email-sender-avatar"
                  style={avatarMap[email.fromAddress.toLowerCase()] ? {} : { background: stringToColor(email.fromAddress) }}
                >
                  {avatarMap[email.fromAddress.toLowerCase()] ? (
                    <img
                      src={avatarMap[email.fromAddress.toLowerCase()]}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    getInitials(email.fromName, email.fromAddress)
                  )}
                </div>
                <span className="email-from">
                  {email.fromName || email.fromAddress.split("@")[0]}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {email.isStarred && (
                  <Star size={12} fill="var(--warning)" color="var(--warning)" />
                )}
                {email.attachments?.length > 0 && (
                  <Paperclip size={12} color="var(--text-muted)" />
                )}
                <span className="email-time">{formatDate(email.sentAt)}</span>
              </div>
            </div>
            <div className="email-subject">{email.subject || "(no subject)"}</div>
            <div className="email-preview">{email.bodyText?.slice(0, 90) || ""}</div>

            <div className="email-item-actions">
              <button
                className={`icon-btn ${email.isStarred ? "starred" : ""}`}
                onClick={e => toggleStar(e, email)}
                title={email.isStarred ? "Unstar" : "Star"}
              >
                <Star size={14} fill={email.isStarred ? "currentColor" : "none"} />
              </button>
              {folder !== "TRASH" && (
                <button
                  className="icon-btn danger"
                  onClick={e => trashEmail(e, email)}
                  title="Move to trash"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", gap: 8, justifyContent: "center",
          alignItems: "center", padding: "10px 12px",
          borderTop: "1px solid var(--border)",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
        }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
