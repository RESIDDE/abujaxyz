import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// GET /api/profile/avatars?emails=a@x.com,b@x.com
// Returns a map of email -> avatarUrl for any registered users
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({}, { status: 401 });

  const emailsParam = req.nextUrl.searchParams.get("emails") || "";
  const emails = emailsParam.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return NextResponse.json({});

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data: users } = await supabaseAdmin
    .from("User")
    .select("email, avatar")
    .in("email", emails);

  const map: Record<string, string> = {};
  for (const u of users || []) {
    if (u.avatar) map[u.email.toLowerCase()] = u.avatar;
  }

  return NextResponse.json(map);
}
