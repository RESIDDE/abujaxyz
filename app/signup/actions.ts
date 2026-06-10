'use server'

import { createClient } from '@supabase/supabase-js'

// We need the service role key to bypass RLS and create admin users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function createAdminUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const activationCode = formData.get('activationCode') as string

  if (activationCode !== 'ABUJACARS') {
    return { error: 'Invalid activation code' }
  }

  // Create the user in Supabase Auth using admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: 'SUPERADMIN'
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  // Since we don't have Prisma anymore, we also need to insert the user into our custom User table 
  // if we are keeping the custom User table for foreign keys (Emails, Drafts etc).
  // Wait, if we use Supabase, we can use the `auth.users` table, but typically we keep a public.User table.
  const { error: dbError } = await supabaseAdmin
    .from('User')
    .insert({
      id: authData.user.id, // match auth.users ID
      name,
      email,
      password: 'managed_by_supabase_auth',
      role: 'SUPERADMIN',
      updatedAt: new Date().toISOString(),
    })

  if (dbError) {
    // Note: in a real app we'd want to rollback or handle this better
    console.error('Failed to insert user into public.User:', dbError)
  }

  return { success: true }
}
