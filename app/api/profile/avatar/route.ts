import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "avatars";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WEBP or GIF." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large. Maximum size is 1 MB." }, { status: 400 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filePath = `${authUser.id}/avatar.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  // Upsert file into storage (replaces old avatar)
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);

  // Add cache-busting param so the browser re-fetches the new image
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  // Persist URL to User table
  const { error: dbError } = await supabaseAdmin
    .from("User")
    .update({ avatar: avatarUrl, updatedAt: new Date().toISOString() })
    .eq("id", authUser.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Also update auth metadata so sidebar picks it up from session
  await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { avatar: avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // Try to remove all possible extensions
  const paths = ["jpg", "png", "webp", "gif"].map(ext => `${authUser.id}/avatar.${ext}`);
  await supabaseAdmin.storage.from(BUCKET).remove(paths);

  await supabaseAdmin.from("User").update({ avatar: null, updatedAt: new Date().toISOString() }).eq("id", authUser.id);
  await supabaseAdmin.auth.admin.updateUserById(authUser.id, { user_metadata: { avatar: null } });

  return NextResponse.json({ success: true });
}
