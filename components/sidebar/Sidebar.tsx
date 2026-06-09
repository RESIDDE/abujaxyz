"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
  { href: "/inbox",   label: "Inbox",   icon: "📥", folder: "INBOX" },
  { href: "/starred", label: "Starred", icon: "⭐", folder: "STARRED" },
  { href: "/sent",    label: "Sent",    icon: "📤", folder: "SENT" },
  { href: "/drafts",  label: "Drafts",  icon: "📝", folder: "DRAFT" },
  { href: "/trash",   label: "Trash",   icon: "🗑️", folder: "TRASH" },
];

interface SidebarProps {
  onCompose: () => void;
  impersonatingUser?: { name: string; email: string } | null;
}

export default function Sidebar({ onCompose, impersonatingUser }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const user = impersonatingUser || session?.user;
  const role = (session?.user as any)?.role;

  useEffect(() => {
    fetch("/api/emails?folder=INBOX&limit=1")
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount || 0))
      .catch(() => {});
  }, [pathname]);

  const initials = user?.name
    ?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <aside className={`sidebar ${role === "SUPERADMIN" && !impersonatingUser ? "admin-sidebar" : ""}`}>
      {/* Logo + theme toggle */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✉️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-logo-text">AbujaCarsMail</div>
          <div className="sidebar-logo-sub">@lekksideexpo.com</div>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {!impersonatingUser && (
        <button id="compose-btn" className="compose-btn" onClick={onCompose}>
          <span style={{ fontSize: 15 }}>✏️</span>
          <span>Compose</span>
        </button>
      )}

      {/* Mail navigation */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Mail</div>
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={impersonatingUser
                ? `/admin/impersonate/${(session?.user as any)?.id}${item.href}`
                : item.href}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              id={`nav-${item.folder.toLowerCase()}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.folder === "INBOX" && unreadCount > 0 && (
                <span className="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Admin navigation */}
      {role === "SUPERADMIN" && !impersonatingUser && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Admin</div>
          <Link
            href="/admin"
            className={`sidebar-item ${pathname === "/admin" ? "active" : ""}`}
            id="nav-admin"
          >
            <span className="sidebar-item-icon">🛡️</span>
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/users"
            className={`sidebar-item ${pathname === "/admin/users" ? "active" : ""}`}
            id="nav-admin-users"
          >
            <span className="sidebar-item-icon">👥</span>
            <span>Users</span>
          </Link>
        </div>
      )}

      {/* User card */}
      <div className="sidebar-user">
        <div
          className="sidebar-user-card"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          role="button"
          tabIndex={0}
        >
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
            ↪
          </span>
        </div>
      </div>
    </aside>
  );
}
