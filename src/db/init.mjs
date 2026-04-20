import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, '6tok.db');
const schema = fs.readFileSync(path.join(root, 'src/db/schema.sql'), 'utf8');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(schema);

// Migrations
const mig = (sql) => { try { db.exec(sql); } catch { /* ok */ } };
mig("ALTER TABLE recordings ADD COLUMN trainee_id INTEGER REFERENCES trainees(id)");
mig("CREATE INDEX IF NOT EXISTS idx_recordings_trainee ON recordings(trainee_id)");

console.log('6TOK DB ready at', dbPath);
db.close();
