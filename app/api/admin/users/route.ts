import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

function isSuperAdmin(session: any) {
  return session?.user && session.user.role === "SUPERADMIN";
}

const createUserSchema = z.object({
  name: z.string().min(1),
  emailUsername: z.string().min(1).regex(/^[a-z0-9._-]+$/i, "Only letters, numbers, dots, hyphens"),
  password: z.string().min(6),
  role: z.enum(["USER", "SUPERADMIN"]).default("USER"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, avatar: true },
    orderBy: { createdAt: "desc" },
  });

  // Add email stats
  const usersWithStats = await Promise.all(
    users.map(async (u) => {
      const [inbox, sent] = await Promise.all([
        prisma.email.count({ where: { userId: u.id, folder: "INBOX" } }),
        prisma.email.count({ where: { userId: u.id, folder: "SENT" } }),
      ]);
      return { ...u, inboxCount: inbox, sentCount: sent };
    })
  );

  return NextResponse.json(usersWithStats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const domain = process.env.EMAIL_DOMAIN || "abujacars.com";
  const email = `${parsed.data.emailUsername.toLowerCase()}@${domain}`;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: { name: parsed.data.name, email, password: hashedPassword, role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
