const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTrainer() {
    const email = 'trainer@gmail.com';
    console.log(`Checking for ${email}...`);

    const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .ilike('email', email)
        .single();

    if (pErr) {
        console.error('Error fetching profile:', pErr);
        return;
    }

    console.log('Profile found:', profile);

    if (profile.role !== 'Trainer') {
        console.log('Updating role to Trainer...');
        const { error: upErr } = await supabase
            .from('profiles')
            .update({ role: 'Trainer' })
            .eq('id', profile.id);
        if (upErr) console.error('Error updating role:', upErr);
        else console.log('Role updated.');
    }

    // Check trainers table
    const { data: trainer, error: tErr } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', profile.id)
        .single();

    if (!trainer) {
        console.log('No entry in trainers table. Creating one...');
        const { error: insErr } = await supabase
            .from('trainers')
            .insert({
                id: profile.id,
                experience_years: 5,
                bio: 'Professional Fitness Trainer'
            });
        if (insErr) console.error('Error creating trainer record:', insErr);
        else console.log('Trainer record created.');
    } else {
        console.log('Trainer record already exists.');
    }

    console.log('Authority check complete.');
}

fixTrainer();
