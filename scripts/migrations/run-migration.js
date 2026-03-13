#!/usr/bin/env node

/**
 * ZeroDB Migration Runner (Node.js)
 *
 * This script runs database migrations using Node.js and pg library.
 * Provides better integration with the existing Next.js/TypeScript stack.
 *
 * Usage:
 *   node run-migration.js [migration_file]
 *   npm run migrate
 *
 * Environment Variables Required:
 *   DATABASE_URL - PostgreSQL connection string
 *
 * @author ZDBGame Team
 * @date 2026-03-13
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * Logging utilities
 */
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warning: (msg) => console.warn(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
};

/**
 * Check if required dependencies are available
 */
function checkPrerequisites() {
  log.info('Checking prerequisites...');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL environment variable is not set.');
    console.log('');
    console.log('Please set DATABASE_URL with your ZeroDB connection string:');
    console.log("  export DATABASE_URL='postgresql://user:password@host:port/database'");
    console.log('');
    console.log('For local development:');
    console.log("  export DATABASE_URL='postgresql://localhost:5432/zdbgame'");
    process.exit(1);
  }

  // Check if psql is available
  return new Promise((resolve) => {
    exec('which psql', (error) => {
      if (error) {
        log.error('psql command not found. Please install PostgreSQL client tools.');
        process.exit(1);
      }
      log.success('Prerequisites check passed');
      resolve();
    });
  });
}

/**
 * Test database connection
 */
function testConnection() {
  log.info('Testing database connection...');

  return new Promise((resolve, reject) => {
    exec(
      `psql "${process.env.DATABASE_URL}" -c "SELECT version();"`,
      (error, stdout, stderr) => {
        if (error) {
          log.error('Failed to connect to database');
          log.error('Please check your DATABASE_URL and ensure the database server is running');
          reject(error);
        } else {
          log.success('Database connection successful');
          resolve();
        }
      }
    );
  });
}

/**
 * Create migrations tracking table
 */
function createMigrationsTable() {
  log.info('Setting up migrations tracking table...');

  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_file TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      checksum TEXT,
      execution_time_ms INTEGER
    );

    COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';
  `;

  return new Promise((resolve, reject) => {
    exec(
      `psql "${process.env.DATABASE_URL}" -c "${sql.replace(/\n/g, ' ')}"`,
      (error) => {
        if (error) {
          log.error('Failed to create migrations table');
          reject(error);
        } else {
          log.success('Migrations tracking table ready');
          resolve();
        }
      }
    );
  });
}

/**
 * Calculate file checksum using MD5
 */
function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Check if migration has been applied
 */
function isMigrationApplied(migrationFile) {
  return new Promise((resolve, reject) => {
    exec(
      `psql "${process.env.DATABASE_URL}" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '${migrationFile}';"`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          const count = parseInt(stdout.trim(), 10);
          resolve(count > 0);
        }
      }
    );
  });
}

/**
 * Run a single migration file
 */
async function runMigration(migrationFile) {
  const scriptDir = __dirname;
  const migrationPath = path.join(scriptDir, migrationFile);

  if (!fs.existsSync(migrationPath)) {
    log.error(`Migration file not found: ${migrationFile}`);
    return false;
  }

  // Check if already applied
  const applied = await isMigrationApplied(migrationFile);
  if (applied) {
    log.warning(`Migration ${migrationFile} already applied - skipping`);
    return true;
  }

  log.info(`Running migration: ${migrationFile}`);

  // Calculate checksum
  const checksum = calculateChecksum(migrationPath);

  // Record start time
  const startTime = Date.now();

  return new Promise((resolve) => {
    exec(
      `psql "${process.env.DATABASE_URL}" -f "${migrationPath}"`,
      async (error, stdout, stderr) => {
        if (error) {
          log.error(`Migration ${migrationFile} failed`);
          console.error(stderr);
          resolve(false);
        } else {
          // Calculate execution time
          const executionTime = Date.now() - startTime;

          // Record migration
          const recordSql = `
            INSERT INTO schema_migrations (migration_file, checksum, execution_time_ms)
            VALUES ('${migrationFile}', '${checksum}', ${executionTime});
          `;

          exec(
            `psql "${process.env.DATABASE_URL}" -c "${recordSql.replace(/\n/g, ' ')}"`,
            (recordError) => {
              if (recordError) {
                log.error(`Failed to record migration ${migrationFile}`);
                resolve(false);
              } else {
                log.success(`Migration ${migrationFile} applied successfully (${executionTime}ms)`);
                resolve(true);
              }
            }
          );
        }
      }
    );
  });
}

/**
 * Show migration status
 */
function showMigrationStatus() {
  log.info('Migration Status:');
  console.log('');

  return new Promise((resolve) => {
    exec(
      `psql "${process.env.DATABASE_URL}" -c "SELECT migration_file, applied_at, execution_time_ms || 'ms' as execution_time FROM schema_migrations ORDER BY applied_at DESC;"`,
      (error, stdout, stderr) => {
        if (error) {
          log.warning('No migrations applied yet');
        } else {
          console.log(stdout);
        }
        console.log('');
        resolve();
      }
    );
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('');
  log.info('ZeroDB Migration Runner v1.0 (Node.js)');
  console.log('');

  try {
    // Check prerequisites
    await checkPrerequisites();

    // Test database connection
    await testConnection();

    // Create migrations tracking table
    await createMigrationsTable();

    // Determine which migrations to run
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // Run all migrations in order
      log.info('Running all migrations in order...');

      const scriptDir = __dirname;
      const files = fs.readdirSync(scriptDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      if (files.length === 0) {
        log.warning(`No migration files found in ${scriptDir}`);
        process.exit(0);
      }

      let allSuccessful = true;
      for (const file of files) {
        const success = await runMigration(file);
        if (!success) {
          allSuccessful = false;
          break;
        }
      }

      if (allSuccessful) {
        log.success('All migrations completed successfully');
      } else {
        log.error('Migration process failed');
        process.exit(1);
      }
    } else {
      // Run specific migration
      const migrationFile = args[0];
      const success = await runMigration(migrationFile);
      if (!success) {
        process.exit(1);
      }
    }

    // Show migration status
    await showMigrationStatus();

    log.success('Migration process complete!');
    console.log('');
  } catch (error) {
    log.error('Migration failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();
