import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const draftSchema = z.object({
  toAddresses: z.array(z.string()).default([]),
  ccAddresses: z.array(z.string()).default([]),
  bccAddresses: z.array(z.string()).default([]),
  subject: z.string().default(""),
  bodyHtml: z.string().default(""),
  bodyText: z.string().default(""),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const drafts = await prisma.draft.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(drafts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const userId = session.user.id as string;
  const draft = await prisma.draft.create({
    data: { userId, ...Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, Array.isArray(v) ? JSON.stringify(v) : v])) },
  });
  return NextResponse.json(draft);
}
