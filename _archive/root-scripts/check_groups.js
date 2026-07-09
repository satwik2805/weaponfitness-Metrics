
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTrainer() {
    const email = 'trainer@gmail.com';
    console.log("Checking Trainer:", email);
    const { data: profile } = await supabase.from('profiles').select('*').ilike('email', email).single();
    if (profile) {
        console.log("Profile found:", JSON.stringify(profile, null, 2));
        if (profile.role !== 'Trainer') {
            await supabase.from('profiles').update({ role: 'Trainer' }).eq('id', profile.id);
            console.log("Updated role to Trainer");
        }
        const { data: trainer } = await supabase.from('trainers').select('*').eq('id', profile.id).single();
        if (!trainer) {
            await supabase.from('trainers').insert({ id: profile.id, experience_years: 5 });
            console.log("Created trainer record");
        } else {
            console.log("Trainer record exists");
        }
    } else {
        console.log("Profile not found");
        const { data: all } = await supabase.from('profiles').select('email, role').limit(5);
        console.log("Sample profiles:", JSON.stringify(all, null, 2));
    }
}
checkTrainer();
