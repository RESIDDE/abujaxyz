import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? JSON.stringify(v) : v])
  );
  const draft = await prisma.draft.updateMany({ where: { id: params.id, userId: session.user.id }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.draft.deleteMany({ where: { id: params.id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
