
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function findTrainee() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').eq('role', 'Trainee');
    if (error) console.error(error);
    data.forEach(p => {
        console.log(`- ${p.full_name} (${p.id})`);
    });
}
findTrainee();
