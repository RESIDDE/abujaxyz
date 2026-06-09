"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ImpersonateLayout({ children, params }: { children: React.ReactNode, params: { userId: string } }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // In a real app we'd fetch the user by ID securely. 
    // We can just use the admin users list or a specific endpoint.
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(users => {
        const u = users.find((u: any) => u.id === params.userId);
        if (u) setUser(u);
        else router.push("/admin/users");
      });
  }, [params.userId, router]);

  if (!user) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="app-shell">
      <Sidebar onCompose={() => {}} impersonatingUser={user} />
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="impersonate-banner">
          <span>👀</span>
          <span>Viewing as {user.email} (Read-only)</span>
          <Link href="/admin/users" style={{ marginLeft: "auto", color: "#fbbf24", textDecoration: "underline" }}>
            Exit Impersonation
          </Link>
        </div>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
