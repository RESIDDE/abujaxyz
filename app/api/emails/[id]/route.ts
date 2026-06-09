import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  folder: z.enum(["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = await prisma.email.findFirst({
    where: {
      id: params.id,
      ...(((session.user as any).role !== "SUPERADMIN") && { userId: session.user.id }),
    },
    include: { attachments: true, thread: { include: { emails: { orderBy: { sentAt: "asc" }, include: { attachments: true } } } } },
  });

  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark as read
  if (!email.isRead) {
    await prisma.email.update({ where: { id: params.id }, data: { isRead: true } });
  }

  return NextResponse.json(email);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const email = await prisma.email.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Move to trash first, delete permanently if already in trash
  const email = await prisma.email.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (email.folder === "TRASH") {
    await prisma.email.delete({ where: { id: params.id } });
  } else {
    await prisma.email.update({ where: { id: params.id }, data: { folder: "TRASH" } });
  }

  return NextResponse.json({ success: true });
}
