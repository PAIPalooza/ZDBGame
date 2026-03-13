/**
 * ZeroDB Connection Module
 *
 * Provides connection pooling and query interface for ZeroDB (PostgreSQL).
 * Implements connection retry logic and proper error handling.
 *
 * Environment Variables Required:
 * - DATABASE_URL: PostgreSQL connection string
 *
 * References:
 * - Issue #6: NPC Memory Storage Migration
 * - datamodel.md: ZeroDB schema specification
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/aigame';

// Connection pool configuration
const poolConfig = {
  connectionString: DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
};

// ============================================================================
// Connection Pool
// ============================================================================

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // Don't exit the process, just log the error
    });
  }

  return pool;
}

/**
 * Close the connection pool
 * Should be called during graceful shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================================================
// Query Interface
// ============================================================================

/**
 * Execute a parameterized SQL query
 *
 * @param text - SQL query with $1, $2, etc. placeholders
 * @param params - Array of parameter values
 * @returns Query result
 *
 * @example
 * const result = await query(
 *   'SELECT * FROM players WHERE id = $1',
 *   ['550e8400-e29b-41d4-a716-446655440000']
 * );
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (>100ms)
    if (duration > 100) {
      console.warn('Slow query detected:', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      text: text.substring(0, 100),
      params,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Execute a query with a transaction
 * Automatically commits on success, rolls back on error
 *
 * @param callback - Function that receives a client and performs queries
 * @returns Result from callback
 *
 * @example
 * const result = await transaction(async (client) => {
 *   await client.query('INSERT INTO players ...');
 *   await client.query('INSERT INTO game_events ...');
 *   return { success: true };
 * });
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Test database connectivity
 *
 * @returns True if connection successful, false otherwise
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    return result.rowCount === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a table exists in the database
 *
 * @param tableName - Name of the table to check
 * @returns True if table exists, false otherwise
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName]
  );

  return result.rows[0]?.exists || false;
}

/**
 * Get row count for a table
 *
 * @param tableName - Name of the table
 * @returns Number of rows
 */
export async function getRowCount(tableName: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM ${tableName}`
  );

  return parseInt(result.rows[0]?.count || '0', 10);
}

// ============================================================================
// Type Exports
// ============================================================================

export type { PoolClient, QueryResult, QueryResultRow };
