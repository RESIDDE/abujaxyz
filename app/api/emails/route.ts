import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const querySchema = z.object({
  folder: z.enum(["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"]).default("INBOX"),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(30),
  search: z.string().optional(),
  userId: z.string().optional(), // superadmin impersonation
});

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { folder, page, limit, search, userId } = parsed.data;

  let targetUserId = user.id;
  if (userId && user.user_metadata?.role === "SUPERADMIN") {
    targetUserId = userId;
  }

  const skip = (page - 1) * limit;

  let query = supabase
    .from('Email')
    .select(`*, attachments:Attachment(id, filename, size, mimeType)`, { count: 'exact' })
    .eq('userId', targetUserId)
    .eq('folder', folder)
    .order('sentAt', { ascending: false })
    .range(skip, skip + limit - 1);

  if (search) {
    query = query.or(`subject.ilike.%${search}%,fromAddress.ilike.%${search}%,bodyText.ilike.%${search}%`);
  }

  const { data: emails, count: total, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let unreadQuery = supabase
    .from('Email')
    .select('*', { count: 'exact', head: true })
    .eq('userId', targetUserId)
    .eq('folder', folder)
    .eq('isRead', false);

  if (search) {
    unreadQuery = unreadQuery.or(`subject.ilike.%${search}%,fromAddress.ilike.%${search}%,bodyText.ilike.%${search}%`);
  }

  const { count: unreadCount } = await unreadQuery;

  return NextResponse.json({
    emails,
    total: total || 0,
    unreadCount: unreadCount || 0,
    page,
    totalPages: Math.ceil((total || 0) / limit),
  });
}
