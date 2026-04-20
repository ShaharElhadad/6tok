import { DatabaseSync, type StatementSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, '6tok.db');

let _db: DatabaseSync | null = null;

/**
 * Wraps node:sqlite with a better-sqlite3-compatible API shim so call sites
 * can use `.prepare(sql).get/all/run(...)` and `db.transaction(fn)`.
 */
export type Db = {
  raw: DatabaseSync;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...args: any[]) => any;
    all: (...args: any[]) => any[];
    run: (...args: any[]) => { lastInsertRowid: number | bigint; changes: number };
  };
  transaction: <T>(fn: () => T) => () => T;
};

function wrap(db: DatabaseSync): Db {
  return {
    raw: db,
    exec: (sql) => db.exec(sql),
    prepare: (sql) => {
      const stmt: StatementSync = db.prepare(sql);
      return {
        get: (...args: any[]) => stmt.get(...normalize(args)) ?? undefined,
        all: (...args: any[]) => stmt.all(...normalize(args)) as any[],
        run: (...args: any[]) => {
          const r = stmt.run(...normalize(args));
          return {
            lastInsertRowid: r.lastInsertRowid,
            changes: Number(r.changes ?? 0),
          };
        },
      };
    },
    transaction: <T>(fn: () => T) => {
      return () => {
        db.exec('BEGIN');
        try {
          const res = fn();
          db.exec('COMMIT');
          return res;
        } catch (e) {
          try { db.exec('ROLLBACK'); } catch {}
          throw e;
        }
      };
    },
  };
}

function normalize(args: any[]): any[] {
  // node:sqlite accepts primitive positional args directly.
  // Convert undefined -> null (SQLite requires null).
  return args.map((a) => (a === undefined ? null : a));
}

export function getDb(): Db {
  if (_db) return wrap(_db);
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  const schema = fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf8');
  db.exec(schema);

  _db = db;
  return wrap(db);
}

export type Recording = {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  duration_sec: number | null;
  status:
    | 'uploaded'
    | 'transcribing'
    | 'transcribed'
    | 'analyzing'
    | 'analyzed'
    | 'failed';
  error: string | null;
  script_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TranscriptSegment = {
  id: number;
  recording_id: number;
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
  speaker: string | null;
  words_json: string | null;
};

export type Word = { text: string; start_ms: number; end_ms: number; score?: number };

export type Analysis = {
  id: number;
  recording_id: number;
  score_overall: number | null;
  summary: string | null;
  strengths_json: string | null;
  weaknesses_json: string | null;
  findings_json: string | null;
  script_adherence_json: string | null;
  suggestions_json: string | null;
  raw_json: string | null;
  created_at: string;
};

export type Finding = {
  kind:
    | 'rapport'
    | 'distancing'
    | 'open_question'
    | 'closed_question'
    | 'objection_handling'
    | 'emotion'
    | 'tone_shift'
    | 'pacing'
    | 'script_miss'
    | 'script_hit'
    | 'closing_attempt'
    | 'filler'
    | 'clarity';
  severity: 'positive' | 'neutral' | 'negative';
  start_ms: number;
  end_ms: number;
  quote: string;
  note: string;
  suggestion?: string;
};

export type Script = {
  id: number;
  name: string;
  content: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};
