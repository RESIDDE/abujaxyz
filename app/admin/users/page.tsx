"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", emailUsername: "", password: "", role: "USER" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      
      toast.success("✅ User created successfully");
      setShowModal(false);
      setNewUser({ name: "", emailUsername: "", password: "", role: "USER" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: any) {
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (e) {
      toast.error("Failed to update status");
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Are you sure? This will delete all emails and data for this user permanently.")) return;
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("🗑️ User deleted");
    } catch (e) {
      toast.error("Failed to delete user");
    }
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
            User Management
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Manage staff email accounts, access control, and statistics
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span style={{ fontSize: 16 }}>+</span> Add User
        </button>
      </div>

      {/* Glass Data Table */}
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "var(--glass-shadow)"
      }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Activity Stats</th>
              <th>Date Joined</th>
              <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                  <div style={{
                    display: "inline-block", width: 30, height: 30,
                    border: "3px solid var(--border)",
                    borderTopColor: "var(--accent-light)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                </td>
              </tr>
            ) : users.map(user => (
              <tr key={user.id}>
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--bg-tertiary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 600, color: "var(--text-secondary)", fontSize: 13,
                    }}>
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${user.role === "SUPERADMIN" ? "superadmin" : "user"}`}
                        style={{
                          background: user.role === "SUPERADMIN" ? "var(--accent-glow)" : "var(--bg-tertiary)",
                          color: user.role === "SUPERADMIN" ? "var(--accent-light)" : "var(--text-secondary)",
                          borderColor: user.role === "SUPERADMIN" ? "var(--accent-glow)" : "var(--border)",
                        }}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => toggleStatus(user)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      color: "var(--text-primary)", fontSize: 13,
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: user.isActive ? "var(--success)" : "var(--danger)",
                      boxShadow: user.isActive ? "0 0 8px var(--success)" : "none",
                    }} />
                    {user.isActive ? "Active" : "Disabled"}
                  </button>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    <div title="Inbox" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "var(--accent-light)" }}>📥</span>
                      <span style={{ fontWeight: 500 }}>{user.inboxCount}</span>
                    </div>
                    <div title="Sent" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "var(--text-muted)" }}>📤</span>
                      <span style={{ fontWeight: 500 }}>{user.sentCount}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </td>
                <td style={{ textAlign: "right", paddingRight: 24 }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link href={`/admin/impersonate/${user.id}/inbox`} className="btn btn-ghost btn-sm" title="Impersonate & View Inbox">
                      👁️ View Mail
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--danger)", borderColor: "var(--border)" }}
                      onClick={() => deleteUser(user.id)}
                      title="Delete User permanently"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="compose-modal" style={{ maxWidth: 460, height: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="compose-header">
              <span>👤 Create New User</span>
              <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Samuel Doe"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email Username</label>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <input
                    required
                    className="form-input"
                    style={{ borderRight: "none", borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
                    placeholder="samuel"
                    value={newUser.emailUsername}
                    onChange={e => setNewUser({ ...newUser, emailUsername: e.target.value })}
                  />
                  <div style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderLeft: "none",
                    padding: "0 16px",
                    display: "flex", alignItems: "center",
                    borderTopRightRadius: 10, borderBottomRightRadius: 10,
                    color: "var(--text-muted)", fontSize: 14,
                    pointerEvents: "none"
                  }}>
                    @domain
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  Email address will be formatted using the system's active domain.
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  required type="password" minLength={6}
                  className="form-input"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-input form-select"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="USER">User (Standard Access)</option>
                  <option value="SUPERADMIN">Superadmin (Full Control)</option>
                </select>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="send-btn" disabled={saving}>
                  {saving ? "Creating…" : "✨ Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
