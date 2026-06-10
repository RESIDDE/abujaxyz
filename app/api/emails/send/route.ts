import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/resend";
import { z } from "zod";

const sendSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional().default([]),
  bcc: z.array(z.string().email()).optional().default([]),
  subject: z.string().min(1),
  bodyHtml: z.string(),
  bodyText: z.string().optional().default(""),
  threadId: z.string().nullable().optional().transform(v => v ?? undefined),
  replyToMessageId: z.string().nullable().optional().transform(v => v ?? undefined),
  draftId: z.string().nullable().optional().transform(v => v ?? undefined),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { to, cc, bcc, subject, bodyHtml, bodyText, threadId, replyToMessageId, draftId } = parsed.data;

  let { data: user, error: userError } = await supabase
    .from('User')
    .select('id, name, email')
    .eq('id', authUser.id)
    .single();

  if (userError && userError.code === 'PGRST116') {
    console.log("Public User record missing. Auto-creating from auth metadata...");
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('User')
      .insert({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        password: 'managed_by_supabase_auth',
        role: authUser.user_metadata?.role || 'USER',
        updatedAt: new Date().toISOString(),
      })
      .select('id, name, email')
      .single();
      
    if (insertError) {
      console.error("Auto-create user failed:", insertError);
      return NextResponse.json({ error: "Failed to initialize user record: " + insertError.message, details: insertError }, { status: 500 });
    }
    user = newUser;
  } else if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Resend requires the `from` domain to be verified. We use a system address
    // on the verified domain and set replyTo so replies go back to the real sender.
    const emailDomain = process.env.EMAIL_DOMAIN || "lekksideexpo.com";
    const systemFrom = `${user.name} <noreply@${emailDomain}>`;
    console.log("Sending email from:", systemFrom, "replyTo:", user.email);

    // Send via Resend
    const result = await resend.emails.send({
      from: systemFrom,
      reply_to: `${user.name} <${user.email}>`,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject,
      html: bodyHtml,
      text: bodyText || undefined,
      headers: replyToMessageId ? { "In-Reply-To": replyToMessageId, References: replyToMessageId } : undefined,
    });
    console.log("Resend result:", result);

    if (result.error) throw new Error(result.error.message);

    // Resolve or create thread
    let resolvedThreadId = threadId;
    if (!resolvedThreadId) {
      const { data: thread, error: threadError } = await supabase
        .from('Thread')
        .insert({ id: crypto.randomUUID(), subject, updatedAt: new Date().toISOString() })
        .select('id')
        .single();
      if (threadError) throw new Error(threadError.message);
      resolvedThreadId = thread.id;
    }

    // --- Build admin client once (bypasses RLS) ---
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const now = new Date().toISOString();

    // Save to SENT folder (use admin client to bypass RLS)
    const { data: email, error: emailError } = await supabaseAdmin
      .from('Email')
      .insert({
        id: crypto.randomUUID(),
        messageId: result.data?.id,   // unique Resend ID — only on the SENT copy
        fromAddress: user!.email,
        fromName: user!.name,
        toAddresses: JSON.stringify(to),
        ccAddresses: JSON.stringify(cc),
        bccAddresses: JSON.stringify(bcc),
        subject,
        bodyHtml,
        bodyText,
        folder: "SENT",
        isRead: true,
        userId: user!.id,
        threadId: resolvedThreadId,
        sentAt: now,
      })
      .select()
      .single();

    if (emailError) throw new Error("SENT insert failed: " + emailError.message);

    // --- Internal Delivery ---
    // If any recipients are registered users, deliver directly to their INBOX.
    // NOTE: inbox rows get a null messageId to avoid the UNIQUE constraint.
    const allRecipients = [...to, ...cc, ...bcc].map(e => e.toLowerCase().trim().replace(/[<>]/g, ""));
    
    const { data: internalUsers } = await supabaseAdmin
      .from('User')
      .select('id, email')
      .in('email', allRecipients)
      .neq('isActive', false); // include null and true

    if (internalUsers && internalUsers.length > 0) {
      const internalInserts = internalUsers.map(internalUser => ({
        id: crypto.randomUUID(),
        messageId: null,              // no unique constraint conflict
        fromAddress: user!.email,
        fromName: user!.name,
        toAddresses: JSON.stringify(to),
        ccAddresses: JSON.stringify(cc),
        bccAddresses: JSON.stringify(bcc),
        subject,
        bodyHtml,
        bodyText,
        folder: "INBOX",
        isRead: false,
        userId: internalUser.id,
        threadId: resolvedThreadId,
        sentAt: now,
      }));
      
      const { error: internalError } = await supabaseAdmin.from('Email').insert(internalInserts);
      if (internalError) console.error("Internal delivery failed:", internalError);
      else console.log(`Internally delivered to ${internalUsers.length} inboxes`);
    } else {
      console.log("No internal recipients found for:", allRecipients);
    }


    // Delete draft if it was sent from one
    if (draftId) {
      await supabase
        .from('Draft')
        .delete()
        .eq('id', draftId)
        .eq('userId', user.id);
    }

    return NextResponse.json({ success: true, email, messageId: result.data?.id });
  } catch (err: any) {
    console.error("Send email error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
