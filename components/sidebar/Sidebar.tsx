"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Inbox, Star, Send, FileText, Trash2, Mail, Sun, Moon, Edit2, Shield, Users } from "lucide-react";

const navItems = [
  { href: "/inbox",   label: "Inbox",   icon: <Inbox size={18} />, folder: "INBOX" },
  { href: "/starred", label: "Starred", icon: <Star size={18} />, folder: "STARRED" },
  { href: "/sent",    label: "Sent",    icon: <Send size={18} />, folder: "SENT" },
  { href: "/drafts",  label: "Drafts",  icon: <FileText size={18} />, folder: "DRAFT" },
  { href: "/trash",   label: "Trash",   icon: <Trash2 size={18} />, folder: "TRASH" },
];

interface SidebarProps {
  onCompose: () => void;
  impersonatingUser?: { name: string; email: string } | null;
}

export default function Sidebar({ onCompose, impersonatingUser }: SidebarProps) {
  const [session, setSession] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = impersonatingUser || session?.user?.user_metadata || session?.user;
  const role = session?.user?.user_metadata?.role;

  useEffect(() => {
    fetch("/api/emails?folder=INBOX&limit=1")
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount || 0))
      .catch(() => {});
  }, [pathname]);

  const initials = user?.name
    ?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className={`sidebar ${role === "SUPERADMIN" && !impersonatingUser ? "admin-sidebar" : ""}`}>
      {/* Logo + theme toggle */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Mail size={20} color="var(--bg-base)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-logo-text">AbujaCarsMail</div>
          <div className="sidebar-logo-sub">@abujacars.com</div>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {!impersonatingUser && (
        <button id="compose-btn" className="compose-btn" onClick={onCompose}>
          <Edit2 size={16} />
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
                ? `/admin/impersonate/${session?.user?.id}${item.href}`
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
            <span className="sidebar-item-icon"><Shield size={18} /></span>
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/users"
            className={`sidebar-item ${pathname === "/admin/users" ? "active" : ""}`}
            id="nav-admin-users"
          >
            <span className="sidebar-item-icon"><Users size={18} /></span>
            <span>Users</span>
          </Link>
        </div>
      )}

      {/* User card */}
      <div className="sidebar-user">
        <div
          className="sidebar-user-card"
          onClick={handleSignOut}
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
