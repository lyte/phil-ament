import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const dir = mkdtempSync(path.join(tmpdir(), 'philament-smoke-'));
const port = 4177;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['build/index.js'], {
	env: {
		...process.env,
		PORT: String(port),
		HOST: '127.0.0.1',
		DATABASE_PATH: path.join(dir, 'phil-ament.db'),
		NODE_ENV: 'production',
		PHILAMENT_RESET_AUTH: '0'
	},
	stdio: ['ignore', 'inherit', 'inherit']
});

let failed = false;
const fail = (message) => {
	console.error(message);
	failed = true;
};

async function waitForHealth() {
	const start = Date.now();
	while (Date.now() - start < 30000) {
		try {
			const response = await fetch(`${base}/api/health`);
			if (response.ok) return;
		} catch {
			// server still booting
		}
		await delay(250);
	}
	throw new Error('server did not become healthy');
}

try {
	await waitForHealth();
	const catalog = await (await fetch(`${base}/api/catalog`)).json();
	if (catalog.brands[0]?.name !== 'Bambu Lab') fail(`unexpected first brand: ${catalog.brands[0]?.name}`);
	if (catalog.brands[6]?.name !== 'Generic') fail(`unexpected generic slot: ${catalog.brands[6]?.name}`);
	const bambu = catalog.brands.find((brand) => brand.name === 'Bambu Lab');
	const pla = catalog.materials.find((material) => material.name === 'PLA');
	const colors = await (
		await fetch(`${base}/api/catalog?brandId=${bambu.id}&materialId=${pla.id}`)
	).json();
	const color = colors.colors.find((entry) => entry.materialId === pla.id);
	if (!color) fail('no PLA color');

	const created = await fetch(`${base}/api/inventory`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ brandId: bambu.id, materialId: pla.id, colorId: color.id, rollCount: 2 })
	});
	if (created.status !== 201) fail(`create failed: ${created.status}`);
	const again = await (
		await fetch(`${base}/api/inventory`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ brandId: bambu.id, materialId: pla.id, colorId: color.id, rollCount: 1 })
		})
	).json();
	if (!again.merged || again.item.rollCount !== 3 || again.item.rollWeightG !== 1000) {
		fail(`merge failed: ${JSON.stringify(again)}`);
	}

	const list = await (await fetch(`${base}/api/inventory?q=bambu&material=pla`)).json();
	if (list.summary.rolls !== 3 || list.summary.items !== 1) fail(`list failed: ${JSON.stringify(list.summary)}`);

	const csv = await fetch(`${base}/api/export?format=csv`);
	if (!csv.ok || !csv.headers.get('content-type')?.includes('csv')) fail('csv export failed');

	const patched = await fetch(`${base}/api/inventory/${again.item.id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ rollCount: 1, notes: 'smoke' })
	});
	if (!patched.ok) fail('patch failed');

	const removed = await fetch(`${base}/api/inventory/${again.item.id}`, { method: 'DELETE' });
	if (!removed.ok) fail('delete failed');

	const home = await fetch(base);
	const html = await home.text();
	if (!home.ok || !html.includes('Phil-ament') || !html.includes('Add filament')) fail('home page failed');
	console.log('smoke ok');
} catch (error) {
	console.error(error);
	failed = true;
} finally {
	child.kill('SIGTERM');
	await delay(400);
}

process.exit(failed ? 1 : 0);
