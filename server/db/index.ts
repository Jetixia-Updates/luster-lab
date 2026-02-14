/**
 * Database Connection - Neon PostgreSQL (Lazy Init)
 * ==================================================
 * Connection is created lazily on first use, NOT at import time.
 * This prevents build-time errors when DATABASE_URL is not set.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _sql: NeonQueryFunction<false, false> | null = null;
let _db: NeonHttpDatabase<typeof schema> | null = null;

function ensureConnection() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is required");
    _sql = neon(url);
    _db = drizzle(_sql, { schema });
  }
  return { sql: _sql!, db: _db! };
}

/** Lazy DB instance - only connects when first accessed */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const { db: realDb } = ensureConnection();
    return Reflect.get(realDb, prop, receiver);
  },
});

/** Lazy SQL instance */
export const sql = new Proxy((() => {}) as unknown as NeonQueryFunction<false, false>, {
  apply(_target, thisArg, args) {
    const { sql: realSql } = ensureConnection();
    return Reflect.apply(realSql as any, thisArg, args);
  },
  get(_target, prop, receiver) {
    const { sql: realSql } = ensureConnection();
    return Reflect.get(realSql as any, prop, receiver);
  },
});
