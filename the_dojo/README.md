# The Dojo

A dark-mode, exercise-first progress tracker for personal iPhone gym use. It is a static PWA with Supabase Auth and database-backed exercise data.

The Dojo supports email/password auth, drag-handle exercise ordering, comma-separated exercise tags, tag grouping on the home screen, and JSON backup/restore from the actions menu.

## Supabase Setup

1. Open the Supabase project:

```text
https://dyxqnvokqpwxgtqothcr.supabase.co
```

2. Open SQL Editor.
3. If you already ran the old Progress Log schema and do not need to keep that test data, paste and run the contents of this file first:

```text
../supabase/wipe_dojo_data.sql
```

This drops the old exercise tables so you can start clean. It deletes all existing exercise data in this Supabase project.

4. Paste and run the contents of:

```text
../supabase/schema.sql
```

The main schema is also migration-safe for the old Phase 1 table: it adds `sets`, creates `notes`, copies existing `modifier` values into `notes`, and then removes the old `modifier` column.

5. Open Authentication, then URL Configuration.
6. Set Site URL:

```text
https://lumberbear.github.io/public_lumber/the_dojo/
```

7. Add Redirect URLs:

```text
http://localhost:5173/the_dojo/
https://lumberbear.github.io/public_lumber/the_dojo/
```

The frontend uses the Supabase publishable key. That key is safe to ship in this static app only because Row Level Security in `supabase/schema.sql` restricts every exercise and entry row to the signed-in user.

## Local Mac Preview

From the `public_lumber` repo root, run:

```sh
python3 -m http.server 5173
```

Open the app directly:

```text
http://localhost:5173/the_dojo/
```

Localhost is enough for development. Exercise data comes from Supabase, so the app needs network access after sign-in.

## GitHub Pages Setup

1. Create a new public GitHub repo.
2. Commit and push these files to the repo.
3. In GitHub, open the repo settings.
4. Go to Pages.
5. Set the source to the `main` branch and the repository root.
6. Open the published URL:

```text
https://lumberbear.github.io/public_lumber/the_dojo/
```

The repo root also redirects to The Dojo:

```text
https://lumberbear.github.io/public_lumber/
```

GitHub Pages serves static HTML, CSS, and JavaScript over HTTPS. On GitHub Free, Pages uses public repositories. The repo contains app code only; your workout data is stored in Supabase.

GitHub Pages reference: https://docs.github.com/articles/user-organization-and-project-pages

## Install On iPhone

1. Open the GitHub Pages URL in Safari on your iPhone.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Launch The Dojo from the new Home Screen icon while online.
5. Use the new Home Screen icon at the gym.

Apple guide: https://support.apple.com/en-euro/guide/iphone/iphea86e5236/ios

## Data And Backup

- Workout data is stored in Supabase under your signed-in user.
- Open the `...` actions menu to export a JSON backup to Files or iCloud Drive.
- Open the `...` actions menu to import a previous JSON export.
- Import deletes the current signed-in account's The Dojo data before restoring the backup.

Service worker reference: https://developer.mozilla.org/docs/Web/API/Service_Worker_API

## Loading And Caching

The Dojo does not keep an offline app shell anymore. It depends on Supabase for account data, and old `the-dojo-*` browser caches are cleared automatically on startup. If a previous iPhone install had an older service worker, opening the current app online should retire it.

## Files

- `index.html` - app shell and PWA metadata.
- `styles.css` - dark mobile-first UI.
- `app.js` - Supabase auth, remote data model, tags, ordering, rendering, import/export, and interactions.
- `manifest.webmanifest` - install metadata.
- `service-worker.js` - cleanup worker for retiring old cached versions.
- `assets/` - app icons.
