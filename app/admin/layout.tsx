"use client";

import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/sidebar/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="app-shell">
        <Sidebar onCompose={() => {}} />
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: "transparent", overflowY: "auto",
        }}>
          {/* Admin banner */}
          <div className="admin-banner">
            <span>🛡️</span>
            <span>Superadmin Mode</span>
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7, fontWeight: 400 }}>
              Full system access enabled
            </span>
          </div>
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
