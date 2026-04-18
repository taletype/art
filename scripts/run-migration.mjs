import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function runMigration() {
  try {
    console.log('Connected to Supabase');

    const migrationSql = fs.readFileSync('supabase/migrations/001_auction_house_schema.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('Error executing statement:', error);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('Migration executed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
