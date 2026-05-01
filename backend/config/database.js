const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/taskmanager.db');
let db = null;
let SQL = null;

async function initSQL() {
  if (!SQL) SQL = await require(path.join(__dirname, '../node_modules/sql.js'))();
  return SQL;
}

function saveDb() {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function getDbAsync() {
  if (db) return db;
  const sql = await initSQL();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new sql.Database(fileBuffer);
  } else {
    db = new sql.Database();
  }
  initializeSchema();
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

function initializeSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
    owner_id INTEGER NOT NULL, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member', joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
    project_id INTEGER NOT NULL, assigned_to INTEGER, created_by INTEGER NOT NULL,
    status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium', due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);
  saveDb();
  console.log('✅ SQL Database schema initialized');
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
  stmt.free();
  return undefined;
}

function dbAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0];
  const lastInsertRowid = lastId ? Number(lastId.values[0][0]) : null;
  saveDb();
  return { lastInsertRowid };
}

module.exports = { getDbAsync, getDb, dbGet, dbAll, dbRun, saveDb };
