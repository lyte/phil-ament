import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, getSqlite } from './db';
import { HttpError } from './http';
import { sessions, settings } from './schema';

const SESSION_MS = 1000 * 60 * 60 * 24 * 30;

function setting(key: string) {
	const row = getSqlite().prepare('select value from settings where key = ?').get(key) as
		| { value: string }
		| undefined;
	return row?.value ?? '';
}

function setSetting(key: string, value: string) {
	getSqlite().prepare('update settings set value = ? where key = ?').run(value, key);
}

export function isAuthEnabled() {
	return setting('auth_enabled') === '1';
}

export function hashPassword(password: string) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 32).toString('hex');
	return `scrypt$${salt}$${hash}`;
}

export function passwordMatches(password: string, stored: string) {
	const [algo, salt, hash] = stored.split('$');
	if (algo !== 'scrypt' || !salt || !hash) return false;
	const actual = scryptSync(password, salt, 32);
	const expected = Buffer.from(hash, 'hex');
	if (actual.length !== expected.length) return false;
	return timingSafeEqual(actual, expected);
}

function assertPassword(password: string) {
	if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
		throw new HttpError(400, 'Use a password of at least 8 characters');
	}
}

export function enableAuth(password: string) {
	assertPassword(password);
	const sqlite = getSqlite();
	const hash = hashPassword(password);
	const tx = sqlite.transaction(() => {
		setSetting('password_hash', hash);
		setSetting('auth_enabled', '1');
	});
	tx();
	return createSession();
}

export function disableAuth() {
	const sqlite = getSqlite();
	const tx = sqlite.transaction(() => {
		setSetting('auth_enabled', '0');
		setSetting('password_hash', '');
		sqlite.prepare('delete from sessions').run();
	});
	tx();
}

export function changePassword(currentPassword: string, newPassword: string) {
	if (!isAuthEnabled()) throw new HttpError(400, 'Login is turned off');
	const stored = setting('password_hash');
	if (!passwordMatches(currentPassword, stored)) {
		throw new HttpError(400, 'Current password is wrong');
	}
	assertPassword(newPassword);
	setSetting('password_hash', hashPassword(newPassword));
}

export function login(password: string) {
	if (!isAuthEnabled()) throw new HttpError(400, 'Login is turned off');
	const stored = setting('password_hash');
	if (!stored || !passwordMatches(password, stored)) {
		throw new HttpError(401, 'Wrong password');
	}
	return createSession();
}

function tokenHash(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function createSession() {
	const token = randomBytes(32).toString('base64url');
	const { db } = getDb();
	db.insert(sessions)
		.values({ tokenHash: tokenHash(token), expiresAt: Date.now() + SESSION_MS })
		.run();
	return token;
}

export function sessionIsValid(token: string | undefined) {
	if (!token) return false;
	const { db } = getDb();
	const row = db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash(token))).get();
	if (!row) return false;
	if (row.expiresAt < Date.now()) {
		db.delete(sessions).where(eq(sessions.id, row.id)).run();
		return false;
	}
	return true;
}

export function revokeSession(token: string | undefined) {
	if (!token) return;
	const { db } = getDb();
	db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token))).run();
}

export const SESSION_COOKIE = 'philament_session';
export const SESSION_MAX_AGE = SESSION_MS / 1000;

export function sessionCookieOptions(url: URL) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge: SESSION_MAX_AGE
	};
}
