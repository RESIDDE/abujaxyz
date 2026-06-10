import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  folder: z.enum(["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from('Email')
    .select('*, attachments:Attachment(*)')
    .eq('id', params.id);
  
  if (user.user_metadata?.role !== "SUPERADMIN") {
    query = query.eq('userId', user.id);
  }

  const { data: email, error } = await query.single();

  if (error || !email) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // To get the thread and its emails with attachments, we need to do another query in Supabase 
  // since nested relations three levels deep (`thread.emails.attachments`) can be tricky with postgrest syntax.
  if (email.threadId) {
    const { data: threadData } = await supabase
      .from('Thread')
      .select('*, emails:Email(*, attachments:Attachment(*))')
      .eq('id', email.threadId)
      .single();
    
    email.thread = threadData;
  }

  // Mark as read
  if (!email.isRead) {
    await supabase.from('Email').update({ isRead: true }).eq('id', params.id);
  }

  return NextResponse.json(email);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { error } = await supabase
    .from('Email')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('userId', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: email, error: findError } = await supabase
    .from('Email')
    .select('folder')
    .eq('id', params.id)
    .eq('userId', user.id)
    .single();

  if (findError || !email) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (email.folder === "TRASH") {
    await supabase.from('Email').delete().eq('id', params.id);
  } else {
    await supabase.from('Email').update({ folder: "TRASH" }).eq('id', params.id);
  }

  return NextResponse.json({ success: true });
}
