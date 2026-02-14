/**
 * Reset Database - Drop all tables and re-create
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Dropping all tables...");
  await sql`DROP TABLE IF EXISTS counters CASCADE`;
  await sql`DROP TABLE IF EXISTS deliveries CASCADE`;
  await sql`DROP TABLE IF EXISTS audit_logs CASCADE`;
  await sql`DROP TABLE IF EXISTS pricing_rules CASCADE`;
  await sql`DROP TABLE IF EXISTS purchase_orders CASCADE`;
  await sql`DROP TABLE IF EXISTS suppliers CASCADE`;
  await sql`DROP TABLE IF EXISTS expenses CASCADE`;
  await sql`DROP TABLE IF EXISTS invoices CASCADE`;
  await sql`DROP TABLE IF EXISTS inventory_transactions CASCADE`;
  await sql`DROP TABLE IF EXISTS inventory_items CASCADE`;
  await sql`DROP TABLE IF EXISTS cases CASCADE`;
  await sql`DROP TABLE IF EXISTS patients CASCADE`;
  await sql`DROP TABLE IF EXISTS doctors CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;
  console.log("All tables dropped.");
}

main().catch(console.error);
