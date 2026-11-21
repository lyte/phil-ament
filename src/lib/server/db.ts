import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { ensureSettings, maybeResetAuth, seedIfEmpty } from './seed';

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

type State = {
	path: string;
	sqlite: Database.Database;
	db: AppDatabase;
};

let state: State | null = null;

export function resolveDatabasePath() {
	if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
	const preferred = process.env.DATA_DIR || '/data';
	try {
		mkdirSync(preferred, { recursive: true });
		const testFile = path.join(preferred, '.philament-write-test');
		writeFileSync(testFile, 'ok');
		unlinkSync(testFile);
		return path.join(preferred, 'phil-ament.db');
	} catch {
		const fallback = path.join(process.cwd(), 'data');
		mkdirSync(fallback, { recursive: true });
		return path.join(fallback, 'phil-ament.db');
	}
}

function migrationsFolder() {
	const candidates = [path.resolve('drizzle'), path.resolve('build', 'drizzle')];
	for (const candidate of candidates) {
		if (existsSync(path.join(candidate, 'meta', '_journal.json'))) return candidate;
	}
	throw new Error('Database migrations were not found. Expected a drizzle/ directory.');
}

export function closeDb() {
	state?.sqlite.close();
	state = null;
}

export function getDb() {
	const file = resolveDatabasePath();
	if (state?.path === file) return state;
	if (state) closeDb();
	mkdirSync(path.dirname(file), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: migrationsFolder() });
	seedIfEmpty(sqlite);
	ensureSettings(sqlite);
	maybeResetAuth(sqlite);
	state = { path: file, sqlite, db };
	if (process.env.NODE_ENV !== 'test') {
		console.log(`[phil-ament] database ${file}`);
	}
	return state;
}

export function getSqlite() {
	return getDb().sqlite;
}
