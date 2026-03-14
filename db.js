// db.js — SQLite database setup using sql.js
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'reliefnet.db');

let db; // global db instance

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB file if it exists, otherwise start fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS ward_members (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      phone         TEXT    NOT NULL UNIQUE,
      district      TEXT    NOT NULL,
      ward_number   TEXT    NOT NULL,
      ward_name     TEXT    NOT NULL,
      registered_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS otp_sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      phone      TEXT NOT NULL,
      otp        TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  persist();
  console.log('[DB] SQLite ready at', DB_PATH);
  return db;
}

// Persist in-memory DB to file after every write
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ---- Ward member helpers ----

function registerMember({ name, phone, district, ward_number, ward_name }) {
  try {
    db.run(
      `INSERT INTO ward_members (name, phone, district, ward_number, ward_name)
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, district, ward_number, ward_name]
    );
    persist();
    return { ok: true };
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return { ok: false, error: 'Phone number already registered.' };
    }
    return { ok: false, error: e.message };
  }
}

function findMemberByPhone(phone) {
  const stmt = db.prepare('SELECT * FROM ward_members WHERE phone = ?');
  stmt.bind([phone]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// ---- OTP helpers ----

function saveOTP(phone, otp) {
  // Remove any existing OTP for this phone
  db.run('DELETE FROM otp_sessions WHERE phone = ?', [phone]);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  db.run(
    'INSERT INTO otp_sessions (phone, otp, expires_at) VALUES (?, ?, ?)',
    [phone, otp, expiresAt]
  );
  persist();
}

function verifyOTP(phone, otp) {
  const stmt = db.prepare(
    'SELECT * FROM otp_sessions WHERE phone = ? AND otp = ? AND expires_at > ?'
  );
  stmt.bind([phone, otp, Date.now()]);
  const valid = stmt.step();
  stmt.free();
  if (valid) {
    db.run('DELETE FROM otp_sessions WHERE phone = ?', [phone]);
    persist();
  }
  return valid;
}

module.exports = { initDB, registerMember, findMemberByPhone, saveOTP, verifyOTP };
