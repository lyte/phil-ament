# Phil-ament

Phil-ament is a small, self-hosted inventory for 3D-printing filament. It counts whole rolls. It runs as one container, stores a SQLite database in a folder you keep, and is meant to be used from a phone on your home network.

The image is published to `ghcr.io/lyte/phil-ament`.

## Run it

Install Docker, save the [`docker-compose.yml`](docker-compose.yml) from this repository into an empty folder, and start it:

```bash
mkdir -p phil-ament/data
cd phil-ament
# put docker-compose.yml here
docker compose up -d
```

Open `http://localhost:8080`. Your database is the `data` folder next to the compose file. It stays put when you update.

Step-by-step instructions for a Synology NAS, a Raspberry Pi, and any other Docker host are in [docs/install.md](docs/install.md).

Updating is:

```bash
docker compose pull && docker compose up -d
```

## What it does

- Inventory list with search, material chips, plus/minus steppers, and an optional per-item Low flag (off unless you turn on tracking, then shown at 1 roll or fewer).
- Add a filament by brand, type, and color. Adding the same combination increases its count.
- Edit a roll: count, notes, and the recommended hot-end temperature when the catalog has one.
- Settings for appearance (system, light, or dark), basic or full materials, optional login, and CSV or JSON export.
- Whole 1 kg rolls. The database still stores `roll_weight_g` as 1000.

Login is off until you turn it on in Settings. The password is stored as a scrypt hash. If you forget it, see [Forgot the password](docs/install.md#forgot-the-password).

## Catalog

Brand colors and extruder temperatures are seeded from [SpoolmanDB](https://github.com/Donkie/SpoolmanDB) by Donkie and contributors (commit `8e391c16be4bfde29dfc184e2f0b9a8d154ab550`, retrieved 2026-11-20). SpoolmanDB is MIT licensed. The copyright and permission notice is kept next to the bundled data in [`src/lib/server/catalog/NOTICE`](src/lib/server/catalog/NOTICE).

Phil-ament also adds a Generic brand with a short list of plain colors (white, black, grey, red, and so on). Those colors have no hot-end temperature.

In brand pickers, Bambu Lab, Sunlu, eSun, Ziro, Overture, and Creality come first, then Generic, then every other brand alphabetically.

Basic materials (the default) are PLA, PETG, TPU, ABS, and their variants, such as PLA+, PLA Silk, PLA Matte, PETG-CF, and TPU 95A. Full shows the rest of the catalog.

## Logos and icons

The header uses `static/logo-dark-on-light.svg` and `static/logo-white-on-dark.svg`. The app swaps them with the active theme. Replace those two files to change the logo.

The favicon and home-screen icons are generated from `static/icon-black.svg` and `static/icon-white.svg`. After replacing them, run `npm run icons`.

## Development

Node.js 22 or newer.

```bash
npm install
npm test
npm run dev
```

The dev server listens on port 3000. If `/data` is not writable, the database is created in `./data` instead. `npm run build` then `npm start` runs the production server. `npm run smoke` checks that server.

Phil-ament is by futuristicvlad, released under the [MIT license](LICENSE).
