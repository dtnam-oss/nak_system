/**
 * Database Connection Wrapper
 * Supports self-hosted PostgreSQL with connection pooling
 * Replaces Vercel Postgres/Neon connection
 * 
 * @author NAK Logistics System
 * @date 2026-01-22
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration
const DB_CONFIG = {
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:123@163.223.12.189:5432/nak_vn',
  ssl: false, // Self-hosted PostgreSQL doesn't need SSL
  max: 20, // Maximum pool size
  min: 2, // Minimum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 10000, // Connection timeout 10s
  allowExitOnIdle: false, // Keep pool alive
};

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create database pool
 */
function getPool(): Pool {
  if (pool) return pool;

  console.log('🔌 Initializing PostgreSQL connection pool...');
  console.log('📍 Database:', DB_CONFIG.connectionString?.replace(/:[^:@]*@/, ':***@'));

  pool = new Pool(DB_CONFIG);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
  });

  // Handle pool connection
  pool.on('connect', (client) => {
    console.log('✅ New database client connected to pool');
  });

  // Handle pool removal
  pool.on('remove', (client) => {
    console.log('🔌 Database client removed from pool');
  });

  return pool;
}

/**
 * Test database connection
 */
async function testConnection(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT NOW(), version()');
    console.log('✅ Database connection successful');
    console.log('📅 Server time:', result.rows[0].now);
    console.log('🗄️  PostgreSQL version:', result.rows[0].version.split(',')[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * SQL template literal query (compatible with Vercel Postgres syntax)
 * Usage: await sql`SELECT * FROM table WHERE id = ${id}`
 */
export async function sql<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();

  // Build parameterized query
  let query = '';
  let params: any[] = [];

  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      params.push(values[i]);
      query += `$${params.length}`;
    }
  });

  try {
    const result = await pool.query<T>(query, params);
    return result;
  } catch (error) {
    console.error('❌ SQL Query Error:', error);
    console.error('📝 Query:', query);
    console.error('📊 Params:', params);
    throw error;
  }
}

/**
 * Direct query function
 * Usage: await query('SELECT * FROM table WHERE id = $1', [id])
 */
export async function query<T = any>(
  queryString: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pool = getPool();

  try {
    const result = await pool.query<T>(queryString, params);
    return result;
  } catch (error) {
    console.error('❌ Query Error:', error);
    console.error('📝 Query:', queryString);
    console.error('📊 Params:', params);
    throw error;
  }
}

/**
 * Get a client from the pool for manual transaction control
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Transaction wrapper
 * Automatically handles BEGIN/COMMIT/ROLLBACK
 * 
 * Usage:
 * await transaction(async (client) => {
 *   await client.query('INSERT INTO ...');
 *   await client.query('UPDATE ...');
 * });
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Batch insert helper
 * Inserts multiple rows efficiently
 */
export async function batchInsert(
  table: string,
  columns: string[],
  rows: any[][]
): Promise<QueryResult> {
  if (rows.length === 0) {
    throw new Error('No rows to insert');
  }

  const pool = getPool();
  const placeholders = rows
    .map((_, rowIndex) =>
      `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
    )
    .join(', ');

  const queryString = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
  const params = rows.flat();

  return pool.query(queryString, params);
}

/**
 * Database health check
 */
export async function checkHealth(): Promise<{
  connected: boolean;
  serverTime?: Date;
  version?: string;
  error?: string;
  poolStats?: {
    total: number;
    idle: number;
    waiting: number;
  };
}> {
  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT NOW() as now, version() as version');
      
      return {
        connected: true,
        serverTime: result.rows[0].now,
        version: result.rows[0].version.split(',')[0],
        poolStats: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Close all database connections
 * Call this when shutting down the application
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('🔌 Closing database connection pool...');
    await pool.end();
    pool = null;
    console.log('✅ Database pool closed');
  }
}

// Initialize connection on first import
if (process.env.NODE_ENV !== 'test') {
  testConnection().catch((error) => {
    console.error('❌ Failed to initialize database:', error);
  });
}

// Export pool for advanced usage
export { pool, getPool };
