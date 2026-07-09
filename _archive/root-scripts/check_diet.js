
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root folder
dotenv.config({ path: path.join(__dirname, '.env') });

const url = 'https://sdgrkwbofvxloglbumzy.supabase.co';
const key = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function checkDiet() {
    // Search by full_name instead
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%Chaya%');

    if (pError || !profiles || profiles.length === 0) {
        console.error('Profile Chaya not found:', pError || 'No results');
        return;
    }

    const traineeId = profiles[0].id;
    const fullName = profiles[0].full_name;
    console.log(`\n========================================`);
    console.log(`DIET CHECK FOR: ${fullName} (${traineeId})`);
    console.log(`========================================`);

    // 2. Get Group
    const { data: gm } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('trainee_id', traineeId)
        .maybeSingle();

    const groupId = gm?.group_id;
    console.log('Group ID:', groupId || 'NOT IN ANY GROUP');

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    for (const day of days) {
        const isToday = (day === today);
        console.log(`\n--- ${day.toUpperCase()} ${isToday ? '[TODAY]' : ''} ---`);

        // 3. Check Custom Diet
        const { data: custom } = await supabase
            .from('custom_trainee_diet')
            .select('diet_id')
            .eq('trainee_id', traineeId)
            .eq('day_name', day)
            .maybeSingle();

        if (custom?.diet_id) {
            console.log(`  âœ… Custom Diet ID: ${custom.diet_id}`);
        } else {
            console.log('  â Œ No Custom Diet');
        }

        if (groupId) {
            const { data: groupWeekly } = await supabase
                .from('group_weekly_diet')
                .select('diet_id')
                .eq('group_id', groupId)
                .eq('day_name', day)
                .maybeSingle();

            if (groupWeekly?.diet_id) {
                console.log(`  âœ… Group Diet ID: ${groupWeekly.diet_id}`);
            } else {
                console.log('  â Œ No Group Diet (inherited)');
            }
        }
    }
}

checkDiet().catch(err => console.error(err));
