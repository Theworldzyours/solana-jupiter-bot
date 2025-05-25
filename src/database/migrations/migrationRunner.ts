import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database migration runner
 * Run this script to execute all migrations in order
 */

/**
 * Get PostgreSQL configuration from environment variables
 */
function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'jupiterbot',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'jupiterbot',
  };
}

/**
 * Initialize migrations table if it doesn't exist
 */
async function initMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(pool: Pool): Promise<string[]> {
  const result = await pool.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

/**
 * Apply a single migration
 */
async function applyMigration(pool: Pool, migrationName: string, migrationPath: string): Promise<void> {
  console.log(`Applying migration: ${migrationName}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read migration file
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply migration
    await client.query(sql);
    
    // Record migration in migrations table
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
    
    await client.query('COMMIT');
    console.log(`Migration ${migrationName} applied successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error applying migration ${migrationName}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all migrations in order
 */
async function runMigrations(): Promise<void> {
  const config = getDbConfig();
  const pool = new Pool(config);
  
  try {
    console.log('Connecting to database...');
    await pool.query('SELECT 1');
    console.log('Connected to database');
    
    // Initialize migrations table
    await initMigrationsTable(pool);
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    
    // Get list of all migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Apply each migration that hasn't been applied yet
    for (const migrationFile of migrationFiles) {
      if (!appliedMigrations.includes(migrationFile)) {
        const migrationPath = path.join(migrationsDir, migrationFile);
        await applyMigration(pool, migrationFile, migrationPath);
      } else {
        console.log(`Migration ${migrationFile} already applied, skipping`);
      }
    }
    
    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

export { runMigrations };