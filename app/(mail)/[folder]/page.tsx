"use client";

import { useState } from "react";
import EmailList from "@/components/mail/EmailList";
import EmailView from "@/components/mail/EmailView";
import ComposeModal from "@/components/mail/ComposeModal";

export default function MailFolderPage({ params }: { params: { folder: string } }) {
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<{ type: "reply" | "replyAll" | "forward"; email: any } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const folderParam = params.folder.toUpperCase();
  const validFolders = ["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"];
  const folder = validFolders.includes(folderParam) ? folderParam : "INBOX";

  function handleReply(email: any, type: "reply" | "replyAll" | "forward") {
    setReplyTo({ type, email });
    setComposing(true);
  }

  function handleSent() {
    setRefreshKey(k => k + 1);
  }

  return (
    <>
      <EmailList 
        folder={folder} 
        selectedId={selectedEmail?.id || null} 
        onSelect={setSelectedEmail}
        refreshKey={refreshKey}
      />
      <EmailView 
        emailId={selectedEmail?.id || null} 
        onReply={handleReply}
        onClose={() => setSelectedEmail(null)}
      />
      
      {composing && (
        <ComposeModal 
          onClose={() => { setComposing(false); setReplyTo(null); }} 
          onSent={handleSent}
          replyTo={replyTo}
        />
      )}
    </>
  );
}
