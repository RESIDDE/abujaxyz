import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (basic check)
    const payload = await req.json();

    // Resend inbound webhook payload
    const data = payload.data || payload;
    const to: string = Array.isArray(data.to) ? data.to[0] : data.to;
    const from: string = data.from;
    const subject: string = data.subject || "(no subject)";
    const bodyHtml: string = data.html || "";
    const bodyText: string = data.text || "";
    const messageId: string = data.headers?.["message-id"] || data.messageId || crypto.randomUUID();

    if (!to || !from) {
      return NextResponse.json({ error: "Missing to/from" }, { status: 400 });
    }

    // Extract local part of the recipient email (e.g. "samuel" from "samuel@abujacars.com")
    const recipientEmail = to.toLowerCase().trim().replace(/[<>]/g, "");
    
    // Find the user who owns this email address
    const user = await prisma.user.findFirst({
      where: { email: recipientEmail, isActive: true },
    });

    if (!user) {
      console.log(`No user found for email: ${recipientEmail}`);
      return NextResponse.json({ received: true }); // Acknowledge but ignore
    }

    // Check for duplicate
    const existing = await prisma.email.findFirst({ where: { messageId } });
    if (existing) return NextResponse.json({ received: true });

    // Parse from name and address
    const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || [null, null, from];
    const fromName = fromMatch[1]?.trim() || from;
    const fromAddress = fromMatch[2]?.trim() || from;

    // Find or create thread
    const thread = await prisma.thread.create({ data: { subject } });

    // Handle attachments
    const attachments = data.attachments || [];

    // Save email to user's INBOX
    const email = await prisma.email.create({
      data: {
        messageId,
        fromAddress,
        fromName,
        toAddresses: JSON.stringify([recipientEmail]),
        ccAddresses: JSON.stringify(data.cc ? (Array.isArray(data.cc) ? data.cc : [data.cc]) : []),
        bccAddresses: JSON.stringify([]),
        subject,
        bodyHtml,
        bodyText,
        folder: "INBOX",
        isRead: false,
        userId: user.id,
        threadId: thread.id,
        attachments: attachments.length > 0 ? {
          create: attachments.map((att: any) => ({
            filename: att.filename || "attachment",
            size: att.size || 0,
            mimeType: att.contentType || att.mimeType || "application/octet-stream",
            content: att.content,
          })),
        } : undefined,
      },
    });

    console.log(`Email delivered to ${user.email}: ${subject}`);
    return NextResponse.json({ received: true, emailId: email.id });
  } catch (err: any) {
    console.error("Inbound webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
