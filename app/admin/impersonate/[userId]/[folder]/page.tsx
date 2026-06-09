"use client";

import { useState } from "react";
import EmailList from "@/components/mail/EmailList";
import EmailView from "@/components/mail/EmailView";

export default function ImpersonateFolderPage({ params }: { params: { userId: string, folder: string } }) {
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const folderParam = params.folder.toUpperCase();
  const validFolders = ["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"];
  const folder = validFolders.includes(folderParam) ? folderParam : "INBOX";

  return (
    <>
      <EmailList 
        folder={folder} 
        selectedId={selectedEmail?.id || null} 
        onSelect={setSelectedEmail}
        impersonateUserId={params.userId}
      />
      <EmailView 
        emailId={selectedEmail?.id || null} 
        onReply={() => {}}
        onClose={() => setSelectedEmail(null)}
        impersonating={true}
      />
    </>
  );
}
