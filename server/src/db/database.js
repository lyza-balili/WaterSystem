const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "..", "water_system.db");
const isNewDb = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initSchema() {
  db.exec(`
    -- ─────────────────────────────────────────────────────────
    -- Households: one row per connected water account
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,              -- e.g. "HH-001"
      name TEXT NOT NULL,               -- resident full name on the account
      standpost INTEGER NOT NULL,
      meter TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      date_connected TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────
    -- Resident accounts: login credentials for a household.
    -- A household can be claimed by either:
    --   (a) a household password (set on first login), or
    --   (b) a linked Google account (google_sub / google_email)
    -- Both can coexist once a resident links Google after
    -- already having a password, or vice versa.
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS resident_accounts (
      household_id TEXT PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
      password_hash TEXT,               -- bcrypt hash, null until first login sets one
      google_sub TEXT UNIQUE,           -- Google's stable user id ("sub" claim)
      google_email TEXT,
      google_name TEXT,
      google_picture TEXT,
      reset_code_hash TEXT,
      reset_code_expires TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────
    -- Admin accounts
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS admin_accounts (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      reset_code_hash TEXT,
      reset_code_expires TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────
    -- Billing periods (e.g. "May 2026") with per-household bills
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      period TEXT NOT NULL,             -- "May 2026"
      prev_cm3 INTEGER NOT NULL,
      curr_cm3 INTEGER NOT NULL,
      amount REAL NOT NULL,
      prev_balance REAL NOT NULL DEFAULT 0,
      total_due REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Unpaid', -- Unpaid | GCash Pending | Paid
      payment_method TEXT,              -- GCash | Offline
      payment_ref TEXT,
      payment_date TEXT,
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(household_id, period)
    );

    -- ─────────────────────────────────────────────────────────
    -- Raw sensor readings (IoT flow data)
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      cm3 INTEGER NOT NULL,
      flow_rate REAL NOT NULL,
      flow_type TEXT NOT NULL DEFAULT 'Normal', -- Normal | High flow
      recorded_at TEXT DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────
    -- Alerts (leak / high-flow notifications shown to admin)
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,              -- "ALT-941"
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      type TEXT NOT NULL,               -- Leak Detected | High Flow | No Sensor Data
      flow_rate TEXT,
      threshold TEXT DEFAULT '50 L/m',
      status TEXT NOT NULL DEFAULT 'Unresolved', -- Unresolved | Resolved
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────
    -- Leak reports submitted by residents
    -- ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS leak_reports (
      id TEXT PRIMARY KEY,              -- "LK-123456"
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'minor', -- minor | moderate | major
      contact_back INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'Open', -- Open | In Progress | Resolved
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bills_household ON bills(household_id);
    CREATE INDEX IF NOT EXISTS idx_readings_household ON readings(household_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_household ON alerts(household_id);
  `);

  // Migration: add columns to households that may not exist on a DB file
  // created before these fields were introduced.
  const householdColumns = db.prepare("PRAGMA table_info(households)").all().map((c) => c.name);
  if (!householdColumns.includes("phone")) {
    db.exec("ALTER TABLE households ADD COLUMN phone TEXT");
  }
  if (!householdColumns.includes("email")) {
    db.exec("ALTER TABLE households ADD COLUMN email TEXT");
  }

  const adminColumns = db.prepare("PRAGMA table_info(admin_accounts)").all().map((c) => c.name);
  if (!adminColumns.includes("reset_code_hash")) {
    db.exec("ALTER TABLE admin_accounts ADD COLUMN reset_code_hash TEXT");
  }
  if (!adminColumns.includes("reset_code_expires")) {
    db.exec("ALTER TABLE admin_accounts ADD COLUMN reset_code_expires TEXT");
  }

  const residentAccountColumns = db.prepare("PRAGMA table_info(resident_accounts)").all().map((c) => c.name);
  if (!residentAccountColumns.includes("reset_code_hash")) {
    db.exec("ALTER TABLE resident_accounts ADD COLUMN reset_code_hash TEXT");
  }
  if (!residentAccountColumns.includes("reset_code_expires")) {
    db.exec("ALTER TABLE resident_accounts ADD COLUMN reset_code_expires TEXT");
  }
  if (!residentAccountColumns.includes("username")) {
    db.exec("ALTER TABLE resident_accounts ADD COLUMN username TEXT");
  }
}

initSchema();

module.exports = { db, isNewDb };