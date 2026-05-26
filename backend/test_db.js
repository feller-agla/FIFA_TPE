const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', url);

if (!url || !key) {
  console.error('Supabase URL or Key missing from backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Checking "prices" table...');
  const { data: initialData, error: readError } = await supabase.from('prices').select('*');
  if (readError) {
    console.error('Error reading table:', readError.message);
    return;
  }

  console.log('Current prices rows:', initialData.length);
  if (initialData.length === 0) {
    console.log('Table is empty, seeding defaults...');
    const defaults = [
      { id: 'passenger', label: 'Transport de passager', amount: 1200 },
      { id: 'colis_petit', label: 'Colis Petit', amount: 1000 },
      { id: 'colis_moyen', label: 'Colis Moyen', amount: 2000 },
      { id: 'colis_grand', label: 'Colis Grand', amount: 4000 }
    ];

    const { data: insertedData, error: insertError } = await supabase
      .from('prices')
      .insert(defaults)
      .select();

    if (insertError) {
      console.error('Error inserting defaults:', insertError.message);
    } else {
      console.log('Seeded successfully! Inserted data:', insertedData);
    }
  } else {
    console.log('Table already has data:', initialData);
  }
}

run();
