const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: users, error: uError } = await supabase.from('User').select('*');
  console.log('Public Users:', users?.length, uError);
  
  const { data: authUsers, error: aError } = await supabase.auth.admin.listUsers();
  console.log('Auth Users:', authUsers?.users?.length, aError);
  
  if (users?.length === 0 && authUsers?.users?.length > 0) {
    console.log('Found auth users but no public users. Auto-creating...');
    for (const au of authUsers.users) {
      const { error } = await supabase.from('User').insert({
        id: au.id,
        email: au.email,
        name: au.user_metadata?.name || au.email.split('@')[0],
        password: 'managed',
        role: au.user_metadata?.role || 'USER'
      });
      console.log('Insert result for', au.email, ':', error);
    }
  }
}

checkDb();
