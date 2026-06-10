"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Camera, Trash2, Upload, User } from "lucide-react";

export default function ProfilePage() {
  const [session, setSession] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAvatarUrl(session?.user?.user_metadata?.avatar || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      setAvatarUrl(session?.user?.user_metadata?.avatar || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user;
  const initials = user?.user_metadata?.name
    ?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("File too large. Max 1 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, WEBP, or GIF.");
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setAvatarUrl(data.avatarUrl);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh session so sidebar updates
      const supabase = createClient();
      await supabase.auth.refreshSession();

      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove photo");

      setAvatarUrl(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const supabase = createClient();
      await supabase.auth.refreshSession();

      toast.success("Profile photo removed.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  }

  const displayAvatar = preview || avatarUrl;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 640 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
          Profile Settings
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Manage your profile photo and account details
        </p>
      </div>

      {/* Avatar card */}
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderRadius: 20,
        padding: "32px",
        boxShadow: "var(--glass-shadow)",
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
          {/* Avatar display */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid var(--border-strong)",
                background: "var(--bg-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 700,
                color: "var(--text-secondary)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to change photo"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>

            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--accent)",
                border: "2px solid var(--bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}
              title="Change photo"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Info + controls */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              {user?.user_metadata?.name || "—"}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
              {user?.email}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {preview ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Upload size={14} />
                    {uploading ? "Uploading…" : "Save Photo"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <User size={14} />
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </button>
                  {avatarUrl && (
                    <button
                      className="btn btn-ghost"
                      onClick={handleRemove}
                      disabled={removing}
                      style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)" }}
                    >
                      <Trash2 size={14} />
                      {removing ? "Removing…" : "Remove"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <div style={{ marginTop: 24, padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 10, fontSize: 12, color: "var(--text-muted)" }}>
          Accepted formats: JPEG, PNG, WEBP, GIF · Max size: <strong style={{ color: "var(--text-secondary)" }}>1 MB</strong>
        </div>
      </div>

      {/* Account info card */}
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderRadius: 20,
        padding: "24px 32px",
        boxShadow: "var(--glass-shadow)",
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: "var(--text-secondary)" }}>
          ACCOUNT INFO
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Full Name", value: user?.user_metadata?.name },
            { label: "Email Address", value: user?.email },
            { label: "Role", value: user?.user_metadata?.role || "USER" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value || "—"}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 16 }}>
          To change your name or password, contact your administrator.
        </p>
      </div>
    </div>
  );
}
