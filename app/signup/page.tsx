"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { createAdminUser } from "./actions";

export default function SignupPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("activationCode", activationCode);

      const res = await createAdminUser(formData);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Admin account created successfully! Check your email to verify.");
        router.push("/login");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
    }}>
      {/* Theme toggle top-right */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed", top: 20, right: 20,
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(16px)",
          borderRadius: 12, width: 42, height: 42,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 18, color: "var(--text-primary)",
          boxShadow: "var(--glass-shadow)",
          transition: "all 0.2s",
          zIndex: 50,
        }}
        title="Toggle theme"
        aria-label="Toggle light/dark mode"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, margin: "0 auto 18px",
            background: "var(--accent-gradient)",
            borderRadius: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
            boxShadow: "0 8px 32px var(--accent-glow), 0 0 0 1px rgba(255,255,255,0.08)",
            animation: "float 4s ease-in-out infinite",
          }}>🔑</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: "var(--text-primary)",
            marginBottom: 6, letterSpacing: "-0.6px",
          }}>
            Create Admin
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Activate your admin account
          </p>
        </div>

        {/* Glass card */}
        <div style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: 24,
          padding: "32px 30px",
          boxShadow: "var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Shimmer top */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
          }} />

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="signup-name">Full Name</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, pointerEvents: "none",
                }}>👤</span>
                <input
                  id="signup-name"
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="signup-email">Email Address</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, pointerEvents: "none",
                }}>📧</span>
                <input
                  id="signup-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="signup-password">Password</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, pointerEvents: "none",
                }}>🔒</span>
                <input
                  id="signup-password"
                  type={showPw ? "text" : "password"}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 15, color: "var(--text-muted)", padding: 4,
                  }}
                  aria-label="Toggle password visibility"
                >{showPw ? "🙈" : "👁️"}</button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="form-label" htmlFor="signup-activation">Activation Code</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, pointerEvents: "none",
                }}>🛡️</span>
                <input
                  id="signup-activation"
                  type="text"
                  className="form-input"
                  placeholder="Secret Code"
                  value={activationCode}
                  onChange={e => setActivationCode(e.target.value)}
                  required
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              className="send-btn"
              style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 14 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span>
                  Creating…
                </>
              ) : (
                <>✨ Create Account</>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 22, fontSize: 12, color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-secondary)", fontWeight: 500, textDecoration: "none" }}>
            Sign in instead
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
