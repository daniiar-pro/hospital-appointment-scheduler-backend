import "dotenv/config";
import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

export interface DbExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
}

export interface Database extends DbExecutor {
  pool: Pool;
  withTransaction<R>(fn: (tx: DbExecutor) => Promise<R>): Promise<R>;
  close(): Promise<void>;
}

export function createDatabase(conn: { connectionString?: string } | PoolConfig): Database {
  const pool = new Pool(conn as PoolConfig);

  const exec: DbExecutor = {
    async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
      return pool.query<T>(text, params as any[]);
    },
  };

  async function withTransaction<R>(fn: (tx: DbExecutor) => Promise<R>): Promise<R> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txExec: DbExecutor = {
        async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
          return client.query<T>(text, params as any[]);
        },
      };
      const result = await fn(txExec);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    pool,
    query: exec.query,
    withTransaction,
    close: () => pool.end(),
  };
}
