import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: totalEmailsToday },
    { count: totalInbound }
  ] = await Promise.all([
    supabase.from('User').select('*', { count: 'exact', head: true }),
    supabase.from('User').select('*', { count: 'exact', head: true }).eq('isActive', true),
    supabase.from('Email').select('*', { count: 'exact', head: true })
      .eq('folder', 'SENT')
      .gte('sentAt', todayStart),
    supabase.from('Email').select('*', { count: 'exact', head: true })
      .eq('folder', 'INBOX')
      .gte('createdAt', todayStart),
  ]);

  return NextResponse.json({ 
    totalUsers: totalUsers || 0, 
    activeUsers: activeUsers || 0, 
    totalEmailsToday: totalEmailsToday || 0, 
    totalInbound: totalInbound || 0 
  });
}
