"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Inbox, Star, Send, FileText, Trash2, Mail, Sun, Moon,
  Edit2, Shield, Users, UserCircle, LogOut, ChevronUp, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { href: "/inbox",   label: "Inbox",   icon: <Inbox size={18} />,    folder: "INBOX" },
  { href: "/starred", label: "Starred", icon: <Star size={18} />,     folder: "STARRED" },
  { href: "/sent",    label: "Sent",    icon: <Send size={18} />,     folder: "SENT" },
  { href: "/drafts",  label: "Drafts",  icon: <FileText size={18} />, folder: "DRAFT" },
  { href: "/trash",   label: "Trash",   icon: <Trash2 size={18} />,   folder: "TRASH" },
];

interface SidebarProps {
  onCompose: () => void;
  impersonatingUser?: { name: string; email: string } | null;
}

export default function Sidebar({ onCompose, impersonatingUser }: SidebarProps) {
  const [session, setSession] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAvatarUrl(session?.user?.user_metadata?.avatar || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAvatarUrl(session?.user?.user_metadata?.avatar || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [pathname]);

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
    <aside className={`sidebar ${role === "SUPERADMIN" && !impersonatingUser ? "admin-sidebar" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Logo + collapse + theme toggle */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ flexShrink: 0 }}>
          <Mail size={20} color="var(--bg-base)" />
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div className="sidebar-logo-text">AbujaCarsMail</div>
            <div className="sidebar-logo-sub">@abujacars.com</div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: collapsed ? "auto" : 0 }}>
          {!collapsed && (
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button
            className="theme-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </div>

      {!impersonatingUser && (
        <button
          id="compose-btn"
          className="compose-btn"
          onClick={onCompose}
          title={collapsed ? "Compose" : undefined}
          style={collapsed ? { padding: "11px", justifyContent: "center" } : {}}
        >
          <Edit2 size={16} />
          {!collapsed && <span>Compose</span>}
        </button>
      )}

      {/* Mail navigation */}
      <div className="sidebar-section">
        {!collapsed && <div className="sidebar-section-title">Mail</div>}
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={impersonatingUser
                ? `/admin/impersonate/${session?.user?.id}${item.href}`
                : item.href}
              className={`sidebar-item ${isActive ? "active" : ""} ${collapsed ? "sidebar-item-collapsed" : ""}`}
              id={`nav-${item.folder.toLowerCase()}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.folder === "INBOX" && unreadCount > 0 && (
                <span className="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
              {collapsed && item.folder === "INBOX" && unreadCount > 0 && (
                <span className="badge" style={{ position: "absolute", top: 4, right: 4, minWidth: 14, fontSize: 8, padding: "1px 3px" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Admin navigation */}
      {role === "SUPERADMIN" && !impersonatingUser && (
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Admin</div>}
          <Link
            href="/admin"
            className={`sidebar-item ${pathname === "/admin" ? "active" : ""} ${collapsed ? "sidebar-item-collapsed" : ""}`}
            id="nav-admin"
            title={collapsed ? "Dashboard" : undefined}
          >
            <span className="sidebar-item-icon"><Shield size={18} /></span>
            {!collapsed && <span>Dashboard</span>}
          </Link>
          <Link
            href="/admin/users"
            className={`sidebar-item ${pathname === "/admin/users" ? "active" : ""} ${collapsed ? "sidebar-item-collapsed" : ""}`}
            id="nav-admin-users"
            title={collapsed ? "Users" : undefined}
          >
            <span className="sidebar-item-icon"><Users size={18} /></span>
            {!collapsed && <span>Users</span>}
          </Link>
        </div>
      )}

      {/* User card with dropdown */}
      <div className="sidebar-user" ref={dropdownRef} style={{ position: "relative" }}>

        {/* Dropdown menu — renders above the card */}
        {dropdownOpen && !impersonatingUser && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 8,
            right: 8,
            background: "var(--glass-bg)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
            overflow: "hidden",
            zIndex: 100,
          }}>
            <Link
              href="/profile"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px",
                color: "var(--text-primary)", fontSize: 13, fontWeight: 500,
                textDecoration: "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <UserCircle size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              View Profile
            </Link>
            <div style={{ height: 1, background: "var(--border)", margin: "0 10px" }} />
            <button
              onClick={handleSignOut}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "11px 14px",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--danger)", fontSize: 13, fontWeight: 500,
                textAlign: "left", transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={15} style={{ flexShrink: 0 }} />
              Sign Out
            </button>
          </div>
        )}

        {/* Clickable user card */}
        <button
          className="sidebar-user-card"
          onClick={() => !impersonatingUser && (collapsed ? setCollapsed(false) : setDropdownOpen(o => !o))}
          style={{
            width: "100%", background: "none", border: "none",
            cursor: impersonatingUser ? "default" : "pointer",
            textAlign: "left",
            justifyContent: collapsed ? "center" : undefined,
          }}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          title={collapsed ? (user?.name || "Account") : undefined}
        >
          <div className="sidebar-avatar" style={{ overflow: "hidden", flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              initials
            )}
          </div>
          {!collapsed && (
            <>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-email">{user?.email}</div>
              </div>
              {!impersonatingUser && (
                <ChevronUp
                  size={14}
                  style={{
                    flexShrink: 0,
                    color: "var(--text-muted)",
                    transition: "transform 0.2s",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              )}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
