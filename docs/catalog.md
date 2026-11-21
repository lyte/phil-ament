# Catalog updates

Phil-ament ships a snapshot of [SpoolmanDB](https://github.com/Donkie/SpoolmanDB) in `src/lib/server/catalog/`. The app reads that snapshot from disk. It does not contact GitHub or SpoolmanDB while it is running.

The snapshot's commit and retrieval date are in [`src/lib/server/catalog/NOTICE`](../src/lib/server/catalog/NOTICE). Phil-ament adds a separate Generic brand, with plain colors and no hot-end temperature, when it creates a database. That brand is not part of SpoolmanDB. Brand pickers still list Bambu Lab, Sunlu, eSun, Ziro, Overture, and Creality first, then Generic, then every other brand.

## Monthly workflow

[`.github/workflows/catalog-sync.yml`](../.github/workflows/catalog-sync.yml) runs on the 1st of each month (06:17 UTC; GitHub sometimes starts it a little later). You can also start it by hand: open the **Actions** tab, choose **Update SpoolmanDB catalog**, and click **Run workflow**.

The workflow runs `npm run catalog:update`. That clones the latest SpoolmanDB and rebuilds `catalog-data.json` and `NOTICE`. If the latest commit is the one already recorded, it leaves the files alone and does not open a pull request. If something changed, it opens a pull request titled `Update SpoolmanDB catalog (<short sha>)`, or updates that pull request if an older one is still open. The pull request says how many brands, filament colors, and materials were added or removed.

## One-time setup

Pull requests from this workflow use the repository's `GITHUB_TOKEN` unless you add the optional secret below. For the default token to open a pull request, a repository admin needs to allow it:

1. Open the repository on GitHub.
2. Go to **Settings → Actions → General**.
3. Under **Workflow permissions**, turn on **Allow GitHub Actions to create and approve pull requests**.
4. Save.

This workflow already asks for the two permissions it needs (`contents: write` and `pull-requests: write`). You do not have to change the repository's default token from read-only.

That checkbox is the only required setup.

## Continuous integration on the update pull request

A pull request created with the default `GITHUB_TOKEN` does not start other workflows. CI will not run on the catalog pull request by itself.

To run CI, close the pull request and reopen it. Reopening is a new pull request event, and CI starts.

Optional, if you would rather not close and reopen: add a repository secret named `CATALOG_SYNC_TOKEN`. The workflow uses that token when the secret exists, and the default token otherwise. A pull request opened with this token does start CI.

Use either of these tokens:

- A fine-grained personal access token for this repository, with **Contents** and **Pull requests** set to Read and write.
- A classic personal access token with the `repo` scope.

Create the token under your GitHub **Settings → Developer settings → Personal access tokens**. Then add it to the repository under **Settings → Secrets and variables → Actions → New repository secret**. The name has to be exactly `CATALOG_SYNC_TOKEN`.

## Update the snapshot yourself

From a checkout of this repository, with Python 3 and git installed:

```bash
npm run catalog:update
```

That needs a network connection, because it clones SpoolmanDB. If the catalog is already current, the command says so and does not change any files. If it writes new files, commit `src/lib/server/catalog/catalog-data.json` and `src/lib/server/catalog/NOTICE`.

`npm run catalog` rebuilds the snapshot from a SpoolmanDB checkout you already have. Point `SPOOLMAN_DIR` at that checkout. It does not clone anything.
