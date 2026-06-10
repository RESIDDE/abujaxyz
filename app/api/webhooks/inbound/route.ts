import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const payload = await req.json();

    // Only handle inbound email events
    if (payload.type !== "email.received") {
      return NextResponse.json({ received: true });
    }

    // Resend email.received payload shape:
    // { type, created_at, data: { email_id, from, to[], cc[], bcc[], subject, message_id, attachments[] } }
    const data = payload.data;

    const emailId: string = data.email_id;
    const from: string = data.from || "";
    const toList: string[] = Array.isArray(data.to) ? data.to : [data.to];
    const ccList: string[] = Array.isArray(data.cc) ? data.cc : data.cc ? [data.cc] : [];
    const bccList: string[] = Array.isArray(data.bcc) ? data.bcc : data.bcc ? [data.bcc] : [];
    const subject: string = data.subject || "(no subject)";
    const messageId: string = data.message_id || emailId || crypto.randomUUID();
    const attachments: any[] = data.attachments || [];

    if (!from || toList.length === 0) {
      return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
    }

    // The recipient is the first address in the to list
    const recipientEmail = toList[0].toLowerCase().trim().replace(/[<>]/g, "");

    // Find the user who owns this inbox address
    const { data: user } = await supabaseAdmin
      .from("User")
      .select("id, email")
      .eq("email", recipientEmail)
      .eq("isActive", true)
      .single();

    if (!user) {
      console.log(`[inbound] No active user for: ${recipientEmail}`);
      return NextResponse.json({ received: true }); // Acknowledge but ignore
    }

    // Deduplicate by message_id
    const { data: existing } = await supabaseAdmin
      .from("Email")
      .select("id")
      .eq("messageId", messageId)
      .single();
    if (existing) {
      console.log(`[inbound] Duplicate message_id: ${messageId}`);
      return NextResponse.json({ received: true });
    }

    // Fetch full email body using the Resend Receiving API
    // (body/headers are NOT included in the webhook payload)
    let bodyHtml = "";
    let bodyText = "";
    try {
      const { data: receivedEmail, error: fetchError } = await resend.emails.receiving.get(emailId);
      if (receivedEmail) {
        console.log("[inbound] receivedEmail keys:", Object.keys(receivedEmail));
        // Resend may nest content under `body` or return flat html/text fields
        const r = receivedEmail as any;
        bodyHtml = r.html || r.body?.html || r.htmlBody || "";
        bodyText = r.text || r.body?.text || r.textBody || r.plainText || "";
      } else {
        console.warn(`[inbound] Could not fetch email body for ${emailId}:`, fetchError);
      }
    } catch (fetchErr) {
      console.warn("[inbound] Failed to fetch email body:", fetchErr);
    }

    // Parse sender name and address (e.g. "John Doe <john@gmail.com>")
    const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || [null, null, from];
    const fromName = fromMatch[1]?.trim() || from;
    const fromAddress = fromMatch[2]?.trim() || from;

    // Create a thread for this email
    const { data: thread } = await supabaseAdmin
      .from("Thread")
      .insert({ id: crypto.randomUUID(), subject, updatedAt: new Date().toISOString() })
      .select("id")
      .single();

    if (!thread) throw new Error("Failed to create thread");

    // Save email to INBOX
    const { data: savedEmail, error: emailError } = await supabaseAdmin
      .from("Email")
      .insert({
        id: crypto.randomUUID(),
        messageId,
        fromAddress,
        fromName,
        toAddresses: JSON.stringify(toList.map((a) => a.toLowerCase().trim().replace(/[<>]/g, ""))),
        ccAddresses: JSON.stringify(ccList.map((a) => a.toLowerCase().trim().replace(/[<>]/g, ""))),
        bccAddresses: JSON.stringify(bccList.map((a) => a.toLowerCase().trim().replace(/[<>]/g, ""))),
        subject,
        bodyHtml,
        bodyText,
        folder: "INBOX",
        isRead: false,
        userId: user.id,
        threadId: thread.id,
      })
      .select("id")
      .single();

    if (emailError || !savedEmail) throw emailError ?? new Error("Email insert failed");

    // Save attachments (Resend provides metadata only; content fetched separately if needed)
    if (attachments.length > 0) {
      const { error: attError } = await supabaseAdmin.from("Attachment").insert(
        attachments.map((att: any) => ({
          id: att.id || crypto.randomUUID(),
          emailId: savedEmail.id,
          filename: att.filename || "attachment",
          size: att.size || 0,
          mimeType: att.content_type || att.contentType || att.mimeType || "application/octet-stream",
          content: att.content || null,
        }))
      );
      if (attError) console.error("[inbound] Attachment insert error:", attError);
    }

    console.log(`[inbound] ✓ Delivered to ${user.email}: "${subject}" (emailId: ${savedEmail.id})`);
    return NextResponse.json({ received: true, emailId: savedEmail.id });
  } catch (err: any) {
    console.error("[inbound] Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
