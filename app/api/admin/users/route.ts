import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function isSuperAdmin(user: any) {
  return user && user.user_metadata?.role === "SUPERADMIN";
}

const createUserSchema = z.object({
  name: z.string().min(1),
  emailUsername: z.string().min(1).regex(/^[a-z0-9._-]+$/i, "Only letters, numbers, dots, hyphens"),
  password: z.string().min(6),
  role: z.enum(["USER", "SUPERADMIN"]).default("USER"),
});

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!isSuperAdmin(authUser)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: users, error } = await supabase
    .from('User')
    .select('id, name, email, role, isActive, createdAt, avatar')
    .order('createdAt', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add email stats
  const usersWithStats = await Promise.all(
    users.map(async (u) => {
      const [{ count: inbox }, { count: sent }] = await Promise.all([
        supabase.from('Email').select('*', { count: 'exact', head: true }).eq('userId', u.id).eq('folder', 'INBOX'),
        supabase.from('Email').select('*', { count: 'exact', head: true }).eq('userId', u.id).eq('folder', 'SENT'),
      ]);
      return { ...u, inboxCount: inbox || 0, sentCount: sent || 0 };
    })
  );

  return NextResponse.json(usersWithStats);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!isSuperAdmin(authUser)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const domain = process.env.EMAIL_DOMAIN || "abujacars.com";
  const email = `${parsed.data.emailUsername.toLowerCase()}@${domain}`;

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Check existing
  const { data: existing } = await supabaseAdmin.from('User').select('id').eq('email', email).single();
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      name: parsed.data.name,
      role: parsed.data.role
    }
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { data: newUser, error: dbError } = await supabaseAdmin
    .from('User')
    .insert({
      id: authData.user.id,
      name: parsed.data.name,
      email,
      password: 'managed_by_supabase_auth',
      role: parsed.data.role,
      updatedAt: new Date().toISOString(),
    })
    .select('id, name, email, role, isActive, createdAt')
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(newUser, { status: 201 });
}
