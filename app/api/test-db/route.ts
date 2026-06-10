import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { count: userCount, error: countError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const { data: users, error: selectError } = await supabase
      .from('User')
      .select('email');

    if (selectError) throw selectError;

    return NextResponse.json({ success: true, userCount: userCount || 0, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}
