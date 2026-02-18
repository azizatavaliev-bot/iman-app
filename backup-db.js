#!/usr/bin/env node
/**
 * Database Backup Script for IMAN App
 * Creates timestamped backups and user registry
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";

const DATA_DIR = process.env.RAILWAY_ENVIRONMENT ? "/data" : join(process.cwd(), "data");
const BACKUP_DIR = join(DATA_DIR, "backups");
const DB_PATH = join(DATA_DIR, "iman.db");
const USER_REGISTRY = join(DATA_DIR, "user_registry.json");

// Create backup directory
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  if (!existsSync(DB_PATH)) {
    console.log("❌ Database not found:", DB_PATH);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const backupPath = join(BACKUP_DIR, `iman-${timestamp}.db`);

  try {
    // Copy database file
    copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);

    // Update user registry
    updateUserRegistry();

    return backupPath;
  } catch (err) {
    console.error("❌ Backup failed:", err);
    return null;
  }
}

function updateUserRegistry() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const users = db.prepare("SELECT telegram_id, data, updated_at FROM users").all();

    const registry = {
      last_updated: new Date().toISOString(),
      total_users: users.length,
      users: users.map(u => {
        const data = JSON.parse(u.data);
        const profile = data.iman_profile || {};

        return {
          telegram_id: u.telegram_id,
          name: profile.name || "Без имени",
          city: profile.city || "",
          level: profile.level || "",
          total_points: profile.totalPoints || 0,
          streak: profile.streak || 0,
          joined_at: profile.joinedAt || null,
          last_updated: u.updated_at,
        };
      }),
    };

    db.close();

    writeFileSync(USER_REGISTRY, JSON.stringify(registry, null, 2));
    console.log(`✅ User registry updated: ${registry.total_users} users`);

    return registry;
  } catch (err) {
    console.error("❌ Registry update failed:", err);
    return null;
  }
}

function listBackups() {
  if (!existsSync(BACKUP_DIR)) {
    console.log("No backups found");
    return [];
  }

  const fs = await import("fs");
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".db"))
    .sort()
    .reverse();

  console.log(`\n📦 Available backups (${files.length}):\n`);
  files.forEach((f, i) => {
    const stat = fs.statSync(join(BACKUP_DIR, f));
    const size = (stat.size / 1024).toFixed(1);
    console.log(`${i + 1}. ${f} (${size} KB)`);
  });

  return files;
}

function getUserCount() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const result = db.prepare("SELECT COUNT(*) as count FROM users").get();
    db.close();
    return result.count;
  } catch (err) {
    return 0;
  }
}

// Main execution
const command = process.argv[2] || "backup";

console.log("=== IMAN App Database Backup Tool ===\n");

switch (command) {
  case "backup":
    console.log(`Current users: ${getUserCount()}`);
    createBackup();
    break;

  case "registry":
    updateUserRegistry();
    break;

  case "list":
    await listBackups();
    break;

  case "status":
    console.log(`Database: ${DB_PATH}`);
    console.log(`Exists: ${existsSync(DB_PATH) ? "✅" : "❌"}`);
    console.log(`Current users: ${getUserCount()}`);

    if (existsSync(USER_REGISTRY)) {
      const registry = JSON.parse(readFileSync(USER_REGISTRY, "utf-8"));
      console.log(`\nUser Registry:`);
      console.log(`  Last updated: ${registry.last_updated}`);
      console.log(`  Registered users: ${registry.total_users}`);
    }
    break;

  default:
    console.log("Usage: node backup-db.js [backup|registry|list|status]");
}
