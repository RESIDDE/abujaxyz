"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import ComposeModal from "@/components/mail/ComposeModal";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [composing, setComposing] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar onCompose={() => setComposing(true)} />
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
        
      {composing && (
        <ComposeModal 
          onClose={() => setComposing(false)} 
          onSent={() => {}} 
        />
      )}
    </div>
  );
}
