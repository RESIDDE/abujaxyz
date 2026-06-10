import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: drafts, error } = await supabase
    .from('Draft')
    .select('*')
    .eq('userId', user.id)
    .order('updatedAt', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(drafts);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const dataToInsert = { 
    id: crypto.randomUUID(),
    userId: user.id, 
    ...Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, Array.isArray(v) ? JSON.stringify(v) : v])
    ),
    updatedAt: new Date().toISOString()
  };

  let { data: draft, error } = await supabase
    .from('Draft')
    .insert(dataToInsert)
    .select()
    .single();

  if (error && error.code === '23503') { // Foreign key violation (userId not in User table)
    console.log("Public User record missing. Auto-creating from auth metadata...");
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    await supabaseAdmin
      .from('User')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        password: 'managed_by_supabase_auth',
        role: user.user_metadata?.role || 'USER',
        updatedAt: new Date().toISOString(),
      });
      
    // Retry draft insert
    const retry = await supabase.from('Draft').insert(dataToInsert).select().single();
    draft = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(draft);
}
