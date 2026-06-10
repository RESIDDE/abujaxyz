import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

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
    const { data: user } = await supabaseAdmin
      .from('User')
      .select('id, email')
      .eq('email', recipientEmail)
      .eq('isActive', true)
      .single();

    if (!user) {
      console.log(`No user found for email: ${recipientEmail}`);
      return NextResponse.json({ received: true }); // Acknowledge but ignore
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('Email')
      .select('id')
      .eq('messageId', messageId)
      .single();
    if (existing) return NextResponse.json({ received: true });

    // Parse from name and address
    const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || [null, null, from];
    const fromName = fromMatch[1]?.trim() || from;
    const fromAddress = fromMatch[2]?.trim() || from;

    // Find or create thread
    const { data: thread } = await supabaseAdmin
      .from('Thread')
      .insert({ id: crypto.randomUUID(), subject, updatedAt: new Date().toISOString() })
      .select('id')
      .single();

    if (!thread) throw new Error("Failed to create thread");

    // Handle attachments
    const attachments = data.attachments || [];

    // Save email to user's INBOX
    const { data: email, error: emailError } = await supabaseAdmin
      .from('Email')
      .insert({
        id: crypto.randomUUID(),
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
      })
      .select('id')
      .single();

    if (emailError || !email) throw emailError;

    if (attachments.length > 0) {
      const { error: attError } = await supabaseAdmin.from('Attachment').insert(
        attachments.map((att: any) => ({
          id: crypto.randomUUID(),
          emailId: email.id,
          filename: att.filename || "attachment",
          size: att.size || 0,
          mimeType: att.contentType || att.mimeType || "application/octet-stream",
          content: att.content,
        }))
      );
      if (attError) console.error("Attachment insert error:", attError);
    }

    console.log(`Email delivered to ${user.email}: ${subject}`);
    return NextResponse.json({ received: true, emailId: email.id });
  } catch (err: any) {
    console.error("Inbound webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
