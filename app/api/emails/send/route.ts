import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/resend";
import { z } from "zod";
import fs from "fs";
import path from "path";

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

  const { to, cc, bcc, subject, bodyText, threadId, replyToMessageId, draftId } = parsed.data;
  let { bodyHtml } = parsed.data;

  const origin = req.nextUrl.origin;
  const logoUrl = `${origin}/abjcarslogo.jpeg`;

  bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="format-detection" content="telephone=no, address=no, email=no">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <!-- Letterhead Header -->
        <tr>
          <td style="padding: 35px 30px; border-bottom: 3px solid #111827; background-color: #ffffff; border-radius: 8px 8px 0 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td valign="middle" width="140" style="padding-right: 20px;">
                  <img src="${logoUrl}" alt="AbujaCars Logo" style="display: block; max-width: 140px; max-height: 80px; height: auto;" />
                </td>
                <td valign="middle" style="text-align: right;">
                  <h1 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">AbujaCars Dealership</h1>
                  <p style="margin: 0 0 4px 0; color: #4b5563; font-size: 13px; line-height: 1.4;">
                    <a href="#" style="color: #4b5563; text-decoration: none; cursor: default; pointer-events: none;">102 Ahmadu Bello Way, Kado, Abuja, Nigeria</a>
                  </p>
                  <p style="margin: 0 0 4px 0; color: #4b5563; font-size: 13px; line-height: 1.4;">
                    <a href="tel:+2348000000000" style="color: #4b5563; text-decoration: none;">+234 800 000 0000</a> &nbsp;|&nbsp; 
                    <a href="mailto:contact@abujacars.com" style="color: #4b5563; text-decoration: none;">contact@abujacars.com</a>
                  </p>
                  <p style="margin: 0; font-size: 13px; font-weight: 500;">
                    <a href="https://abujacars.com" style="color: #2563eb; text-decoration: none;">www.abujacars.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Email Body -->
        <tr>
          <td style="padding: 40px 30px; color: #374151; font-size: 15px; line-height: 1.6;">
            ${bodyHtml}
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="padding: 24px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
              Premium Auto Dealership
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
              &copy; ${new Date().getFullYear()} AbujaCars. All rights reserved.<br/>
              This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

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
    fs.writeFileSync(path.join(process.cwd(), 'error.log'), String(err.stack || err.message || err));
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
