import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  folder: z.enum(["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"]).default("INBOX"),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(30),
  search: z.string().optional(),
  userId: z.string().optional(), // superadmin impersonation
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { folder, page, limit, search, userId } = parsed.data;

  // Only superadmin can view other users
  let targetUserId = session.user.id;
  if (userId && (session.user as any).role === "SUPERADMIN") {
    targetUserId = userId;
  }

  const skip = (page - 1) * limit;

  const where: any = { userId: targetUserId, folder };
  if (search) {
    where.OR = [
      { subject: { contains: search } },
      { fromAddress: { contains: search } },
      { bodyText: { contains: search } },
    ];
  }

  const [emails, total, unreadCount] = await Promise.all([
    prisma.email.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sentAt: "desc" },
      include: { attachments: { select: { id: true, filename: true, size: true, mimeType: true } } },
    }),
    prisma.email.count({ where }),
    prisma.email.count({ where: { userId: targetUserId, folder, isRead: false } }),
  ]);

  return NextResponse.json({
    emails,
    total,
    unreadCount,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
