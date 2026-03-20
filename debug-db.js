const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDetailed() {
    console.log('--- Detailed Table Check ---');
    const tables = ['User', 'Notebook', 'NotePage', 'Snap'];

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ Table "${table}" check error:`, error.message);
            } else {
                console.log(`✅ Table "${table}" exists and is accessible.`);
            }
        } catch (e) {
            console.log(`❌ Table "${table}" catch error:`, e.message);
        }
    }
}

checkDetailed();
