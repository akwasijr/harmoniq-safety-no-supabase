#!/usr/bin/env node

/**
 * Run all Supabase SQL migrations in order.
 *
 * Usage:
 *   node scripts/run-migrations.mjs              # Run all migrations
 *   node scripts/run-migrations.mjs --seed       # Run migrations + seed data
 *   node scripts/run-migrations.mjs --rls        # Run migrations + RLS policies
 *   node scripts/run-migrations.mjs --all        # Run migrations + RLS + seed
 *   node scripts/run-migrations.mjs --dry-run    # Print SQL without executing
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_DIR = join(__dirname, "..", "supabase");
const MIGRATIONS_DIR = join(SUPABASE_DIR, "migrations");

// Load env from .env.local
function loadEnv() {
  const envPaths = [".env.local", ".env"];
  for (const envFile of envPaths) {
    try {
      const content = readFileSync(join(__dirname, "..", envFile), "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // file not found, skip
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includeSeed = args.includes("--seed") || args.includes("--all");
const includeRls = args.includes("--rls") || args.includes("--all");

// Collect migration files in order
const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`\n📦 Harmoniq Safety — Database Migration`);
console.log(`   Supabase: ${supabaseUrl}`);
console.log(`   Migrations: ${migrationFiles.length} files`);
console.log(`   RLS policies: ${includeRls ? "yes" : "no (use --rls)"}`);
console.log(`   Seed data: ${includeSeed ? "yes" : "no (use --seed)"}`);
console.log(`   Dry run: ${dryRun ? "yes" : "no"}\n`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSql(label, sql) {
  if (dryRun) {
    console.log(`── [DRY RUN] ${label}`);
    console.log(sql.slice(0, 200) + (sql.length > 200 ? "..." : ""));
    console.log();
    return true;
  }

  process.stdout.write(`   ⏳ ${label}...`);

  const { error } = await supabase.rpc("exec_sql", { sql_text: sql });

  if (error) {
    // exec_sql RPC might not exist — fall back to raw REST
    // Supabase doesn't have a generic SQL execution endpoint via the client,
    // so we use the management API via fetch
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ sql_text: sql }),
    });

    if (!res.ok) {
      // If exec_sql doesn't exist, instruct user to use SQL Editor
      console.log(` ❌`);
      return false;
    }
  }

  console.log(` ✅`);
  return true;
}

async function main() {
  let allSql = [];

  // 1. Migrations
  for (const file of migrationFiles) {
    const filePath = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(filePath, "utf-8");
    allSql.push({ label: file, sql });
  }

  // 2. RLS policies
  if (includeRls) {
    const rlsPath = join(SUPABASE_DIR, "rls-policies.sql");
    try {
      const sql = readFileSync(rlsPath, "utf-8");
      allSql.push({ label: "rls-policies.sql", sql });
    } catch {
      console.warn("   ⚠️  rls-policies.sql not found, skipping");
    }
  }

  // 3. Seed data
  if (includeSeed) {
    const seedPath = join(SUPABASE_DIR, "seed.sql");
    try {
      const sql = readFileSync(seedPath, "utf-8");
      allSql.push({ label: "seed.sql", sql });
    } catch {
      console.warn("   ⚠️  seed.sql not found, skipping");
    }
  }

  // Try running via exec_sql RPC first
  let rpcAvailable = true;
  for (const { label, sql } of allSql) {
    const ok = await runSql(label, sql);
    if (!ok) {
      rpcAvailable = false;
      break;
    }
  }

  if (!rpcAvailable) {
    // Fallback: generate a combined SQL file for manual execution
    console.log("\n──────────────────────────────────────────────────");
    console.log("⚠️  Cannot execute SQL remotely (exec_sql RPC not available).");
    console.log("   This is normal for new Supabase projects.\n");
    console.log("   ➡️  Run the migrations manually:\n");
    console.log("   1. Go to your Supabase dashboard > SQL Editor");
    console.log("   2. Run each file below IN ORDER:\n");

    for (const { label } of allSql) {
      console.log(`      📄 supabase/migrations/${label}`);
    }

    // Also generate a combined file
    const combinedPath = join(SUPABASE_DIR, ".temp", "combined-migration.sql");
    const combined = allSql
      .map(({ label, sql }) => `-- ========== ${label} ==========\n${sql}`)
      .join("\n\n");

    const { writeFileSync, mkdirSync } = await import("fs");
    mkdirSync(join(SUPABASE_DIR, ".temp"), { recursive: true });
    writeFileSync(combinedPath, combined, "utf-8");

    console.log(
      `\n   Or paste the combined file into SQL Editor:`
    );
    console.log(`      📄 supabase/.temp/combined-migration.sql`);
    console.log("──────────────────────────────────────────────────\n");
  } else {
    console.log("\n✅ All migrations completed successfully!\n");
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
