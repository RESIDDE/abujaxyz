import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { z } from "zod";

const sendSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional().default([]),
  bcc: z.array(z.string().email()).optional().default([]),
  subject: z.string().min(1),
  bodyHtml: z.string(),
  bodyText: z.string().optional().default(""),
  threadId: z.string().optional(),
  replyToMessageId: z.string().optional(),
  draftId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { to, cc, bcc, subject, bodyHtml, bodyText, threadId, replyToMessageId, draftId } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    console.log("Sending email from:", `${user.name} <${user.email}>`);
    // Send via Resend
    const result = await resend.emails.send({
      from: `${user.name} <${user.email}>`,
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
      const thread = await prisma.thread.create({ data: { subject } });
      resolvedThreadId = thread.id;
    }

    // Save to SENT folder
    const email = await prisma.email.create({
      data: {
        messageId: result.data?.id,
        fromAddress: user.email,
        fromName: user.name,
        toAddresses: JSON.stringify(to),
        ccAddresses: JSON.stringify(cc),
        bccAddresses: JSON.stringify(bcc),
        subject,
        bodyHtml,
        bodyText,
        folder: "SENT",
        isRead: true,
        userId: user.id,
        threadId: resolvedThreadId,
      },
    });

    // Delete draft if it was sent from one
    if (draftId) {
      await prisma.draft.deleteMany({ where: { id: draftId, userId: user.id } });
    }

    return NextResponse.json({ success: true, email, messageId: result.data?.id });
  } catch (err: any) {
    console.error("Send email error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
