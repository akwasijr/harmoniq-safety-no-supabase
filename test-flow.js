const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pvcykszmsaavrnjwuqrw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2Y3lrc3ptc2FhdnJuand1cXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzA4OTUsImV4cCI6MjA4NjMwNjg5NX0.ZzZwKGVm0BdIv4iAl3hL3zwMP9-tfzGK0ADbFE3G_58'
);

async function main() {
  // Login
  await supabase.auth.signInWithPassword({ email: 'demo@harmoniq.safety', password: 'HarmoniqDemo2026!' });
  const { data: { user } } = await supabase.auth.getUser();
  console.log('User:', user.id);

  // What AuthProvider does
  const { data: profile, error: profErr } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (profErr) { console.log('PROFILE ERROR:', profErr.message); return; }
  console.log('Profile role:', profile.role, 'company_id:', profile.company_id);
  console.log('Profile full_name:', profile.full_name);
  console.log('Profile has full_name?', 'full_name' in profile, typeof profile.full_name);

  // Check if full_name is null/undefined - dashboard layout uses user.full_name
  if (!profile.full_name) {
    console.log('');
    console.log('WARNING: full_name is falsy:', JSON.stringify(profile.full_name));
    console.log('Dashboard layout line 96 does: userName={user.full_name}');
    console.log('This could cause a render error if undefined');
  }

  // Check all profile fields the app uses
  console.log('');
  console.log('Profile fields used by app:');
  console.log('  id:', profile.id);
  console.log('  email:', profile.email);
  console.log('  first_name:', profile.first_name);
  console.log('  last_name:', profile.last_name);
  console.log('  full_name:', profile.full_name);
  console.log('  role:', profile.role);
  console.log('  company_id:', profile.company_id);
  console.log('  status:', profile.status);
  console.log('  language:', profile.language);
  console.log('  custom_permissions:', profile.custom_permissions);
  
  // Check companies that load in the store
  const { data: companies } = await supabase.from('companies').select('*');
  console.log('');
  console.log('Companies loaded:', companies.length);
  if (companies.length > 0) {
    const c = companies[0];
    console.log('  id:', c.id, 'slug:', c.slug, 'name:', c.name);
    console.log('  primary_color:', c.primary_color);
    console.log('  language:', c.language);
    console.log('  logo_url:', c.logo_url);
  }

  // The currentCompany lookup in useAuth:
  // allCompanies.find(company => company.id === companyId)
  // companyId for non-super-admin = profile.company_id
  const match = companies.find(c => c.id === profile.company_id);
  console.log('');
  console.log('currentCompany match:', match ? 'FOUND' : 'NOT FOUND');
  if (!match) {
    console.log('profile.company_id:', profile.company_id);
    console.log('available company ids:', companies.map(c => c.id));
    console.log('');
    console.log('THIS IS THE BUG: currentCompany is null');
    console.log('Dashboard uses currentCompany?.name → "Platform"');
    console.log('But more critically, currentCompany is used for branding, locale, etc.');
  } else {
    console.log('currentCompany:', match.name, match.slug);
  }
}

main().catch(e => console.error('FATAL:', e));
