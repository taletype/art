import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function readFirstConfiguredEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function requireEnv(names) {
  const value = readFirstConfiguredEnv(names);
  if (!value) {
    console.error(`Missing required environment variable: ${names.join(' or ')}`);
    process.exit(1);
  }

  return value;
}

function listMigrationFiles(migrationsDir) {
  if (!existsSync(migrationsDir)) {
    console.error(`Missing migrations directory: ${migrationsDir}`);
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => path.join(migrationsDir, file));

  if (files.length === 0) {
    console.error(`No SQL migration files found in ${migrationsDir}`);
    process.exit(1);
  }

  return files;
}

function hasExecutableSql(statement) {
  return statement
    .split('\n')
    .some((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });
}

function readDollarQuoteTag(sql, index) {
  const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(index));
  return match?.[0] ?? null;
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let index = 0;
  let inLineComment = false;
  let blockCommentDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarQuoteTag = null;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (dollarQuoteTag) {
      if (sql.startsWith(dollarQuoteTag, index)) {
        current += dollarQuoteTag;
        index += dollarQuoteTag.length;
        dollarQuoteTag = null;
        continue;
      }

      current += char;
      index += 1;
      continue;
    }

    if (inLineComment) {
      current += char;
      index += 1;
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (blockCommentDepth > 0) {
      current += char;
      if (char === '/' && next === '*') {
        current += next;
        blockCommentDepth += 1;
        index += 2;
        continue;
      }
      if (char === '*' && next === '/') {
        current += next;
        blockCommentDepth -= 1;
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        index += 2;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }

      index += 1;
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"' && next === '"') {
        current += next;
        index += 2;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }

      index += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      current += char + next;
      inLineComment = true;
      index += 2;
      continue;
    }

    if (char === '/' && next === '*') {
      current += char + next;
      blockCommentDepth = 1;
      index += 2;
      continue;
    }

    if (char === "'") {
      current += char;
      inSingleQuote = true;
      index += 1;
      continue;
    }

    if (char === '"') {
      current += char;
      inDoubleQuote = true;
      index += 1;
      continue;
    }

    if (char === '$') {
      const tag = readDollarQuoteTag(sql, index);
      if (tag) {
        current += tag;
        dollarQuoteTag = tag;
        index += tag.length;
        continue;
      }
    }

    if (char === ';') {
      const statement = current.trim();
      if (statement && hasExecutableSql(statement)) {
        statements.push(statement);
      }
      current = '';
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  const finalStatement = current.trim();
  if (finalStatement && hasExecutableSql(finalStatement)) {
    statements.push(finalStatement);
  }

  return statements;
}

const supabase = createClient(
  requireEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
  requireEnv(['SUPABASE_SERVICE_ROLE_KEY']),
);

async function runMigration() {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const migrationFiles = listMigrationFiles(migrationsDir);
  let errorCount = 0;

  console.log('Connected to Supabase');

  for (const migrationFile of migrationFiles) {
    const relativePath = path.relative(process.cwd(), migrationFile);
    const statements = splitSqlStatements(readFileSync(migrationFile, 'utf8'));

    console.log(`Running ${relativePath} (${statements.length} statements)`);

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 80).replace(/\s+/g, ' ') + '...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        errorCount += 1;
        console.error('Error executing statement:', error);
      }
    }
  }

  if (errorCount > 0) {
    console.warn(`Migration run completed with ${errorCount} statement error(s). Review the output above.`);
    return;
  }

  console.log('Migrations executed successfully');
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
