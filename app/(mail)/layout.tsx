"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import ComposeModal from "@/components/mail/ComposeModal";

export default function MailLayout({ children }: { children: React.ReactNode }) {
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<{ type: "reply" | "replyAll" | "forward"; email: any } | null>(null);

  // Expose these handlers via context or window so child pages can trigger compose
  // A cleaner way is using React Context, but for brevity we'll attach to window in a real app
  // or pass them down if we restructure. For now, Inbox handles its own reply state, 
  // but Sidebar handles new compose.

  return (
    <div className="app-shell">
      <Sidebar onCompose={() => setComposing(true)} />
        {children}
        
        {composing && (
          <ComposeModal 
            onClose={() => setComposing(false)} 
            onSent={() => {}} 
          />
        )}
    </div>
  );
}
