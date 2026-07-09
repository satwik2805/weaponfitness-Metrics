require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTrainer() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
        .ilike('email', 'trainer@gmail.com')
        .single();

    if (error) {
        console.error('Error:', error);
        // Try listing all profiles to see what we have
        const { data: all } = await supabase.from('profiles').select('email, role').limit(5);
        console.log('Sample profiles:', all);
    } else {
        console.log('Trainer found:', data);

        // Check if this user is also in the trainers table
        const { data: trainerData, error: trainerError } = await supabase
            .from('trainers')
            .select('*')
            .eq('id', data.id)
            .single();

        console.log('Trainer table data:', trainerData || trainerError);
    }
}

checkTrainer();
