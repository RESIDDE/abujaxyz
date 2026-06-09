"use client";

import { useState, useEffect } from "react";

interface Stat { label: string; value: number | string; sub: string; icon: string; color: string; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error);
  }, []);

  const cards: Stat[] = stats ? [
    { label: "Total Users", value: stats.totalUsers, sub: `${stats.activeUsers} active`, icon: "👥", color: "var(--accent)" },
    { label: "Emails Sent Today", value: stats.totalEmailsToday, sub: "via Resend API", icon: "📤", color: "var(--success)" },
    { label: "Received Today", value: stats.totalInbound, sub: "via Inbound Webhook", icon: "📥", color: "var(--accent-3)" },
  ] : [];

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100 }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
          Dashboard Overview
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Real-time system statistics and activity
        </p>
      </div>

      {/* Stats cards */}
      {stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, marginBottom: 40 }}>
          {cards.map(card => (
            <div key={card.label} className="stat-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div className="stat-card-label">{card.label}</div>
                <div style={{
                  width: 38, height: 38,
                  background: `${card.color}22`,
                  border: `1px solid ${card.color}44`,
                  borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {card.icon}
                </div>
              </div>
              <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-card-sub">{card.sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.3px" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { href: "/admin/users", label: "Manage Users", icon: "👥", desc: "Create, edit, deactivate" },
            { href: "/admin/impersonate", label: "Impersonate User", icon: "🎭", desc: "View as any user" },
          ].map(action => (
            <a
              key={action.href}
              href={action.href}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "16px 20px",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "var(--glass-blur)",
                WebkitBackdropFilter: "var(--glass-blur)",
                borderRadius: 14,
                textDecoration: "none",
                boxShadow: "var(--glass-shadow)",
                transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                minWidth: 220,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)";
              }}
            >
              <div style={{
                fontSize: 24, width: 44, height: 44,
                background: "var(--accent-glow)",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {action.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
                  {action.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{action.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
