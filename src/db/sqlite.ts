import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the database and uploads directory exists
const dbPath = path.resolve(process.cwd(), 'nirva.db');
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log(`[Database] Initializing SQLite database at ${dbPath}`);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    height REAL NOT NULL,
    weight REAL NOT NULL,
    activity_level TEXT NOT NULL,
    pregnancy_status TEXT DEFAULT 'none',
    medical_history TEXT,
    allergies TEXT,
    lifestyle_preferences TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    biomarkers TEXT, -- JSON
    vitals TEXT, -- JSON
    diagnoses TEXT, -- JSON
    clinical_notes TEXT,
    health_score INTEGER,
    organ_health TEXT, -- JSON
    specialist TEXT, -- JSON
    raw_gpt_output TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_nutrients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER UNIQUE NOT NULL,
    nutrients TEXT, -- JSON
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS health_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    notes TEXT,
    calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'report_upload', 'analysis', 'alert', 'milestone'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );
`);

export default db;
