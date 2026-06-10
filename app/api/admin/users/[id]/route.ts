import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function isSuperAdmin(user: any) {
  return user && user.user_metadata?.role === "SUPERADMIN";
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["USER", "SUPERADMIN"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!isSuperAdmin(authUser)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  if (data.password) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(params.id, {
      password: data.password
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    delete data.password; // Don't save plaintext in User table
  }

  // Update role or name in Auth metadata if needed
  if (data.name || data.role) {
    const authUpdateData: any = {};
    if (data.name) authUpdateData.name = data.name;
    if (data.role) authUpdateData.role = data.role;
    await supabaseAdmin.auth.admin.updateUserById(params.id, {
      user_metadata: authUpdateData
    });
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from('User')
    .update(data)
    .eq('id', params.id)
    .select('id, name, email, role, isActive')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(updatedUser);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!isSuperAdmin(authUser)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === authUser?.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Deleting from Auth usually cascades to public tables if foreign keys are setup with ON DELETE CASCADE
  // If not, we delete from public.User first. Our migration script has ON DELETE CASCADE for sessions, emails etc, 
  // but public.User doesn't cascade from auth.users unless we setup a trigger. 
  // Let's delete from auth.users which is the source of truth.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also delete from public.User just in case
  await supabaseAdmin.from('User').delete().eq('id', params.id);

  return NextResponse.json({ success: true });
}
