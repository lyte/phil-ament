import { json } from '@sveltejs/kit';

export class HttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export function asInteger(value: unknown, label: string) {
	if (typeof value !== 'number' || !Number.isInteger(value)) {
		throw new HttpError(400, `${label} must be a whole number`);
	}
	return value;
}

export function asOptionalBoolean(value: unknown, label: string) {
	if (value == null) return undefined;
	if (typeof value !== 'boolean') throw new HttpError(400, `${label} must be true or false`);
	return value;
}

export function asOptionalString(value: unknown, label: string, max = 2000) {
	if (value == null) return undefined;
	if (typeof value !== 'string') throw new HttpError(400, `${label} must be text`);
	const trimmed = value.trim();
	if (trimmed.length > max) throw new HttpError(400, `${label} is too long`);
	return trimmed;
}

export function apiJson(data: unknown, status = 200) {
	return json(data, { status, headers: { 'cache-control': 'no-store' } });
}

export function apiError(error: unknown): Response {
	if (error instanceof HttpError) return apiJson({ error: error.message }, error.status);
	throw error;
}

export async function readJson(request: Request) {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		throw new HttpError(400, 'Expected JSON');
	}
}
