# Progress Log

A dark-mode, exercise-first progress tracker for personal iPhone gym use. It is a static PWA with Supabase Auth and database-backed exercise data.

Progress Log supports email/password auth, drag-handle exercise ordering, comma-separated exercise tags, tag grouping on the home screen, and JSON backup/restore for the signed-in account.

## Supabase Setup

1. Open the Supabase project:

```text
https://dyxqnvokqpwxgtqothcr.supabase.co
```

2. Open SQL Editor.
3. Paste and run:

```text
../supabase/schema.sql
```

4. Open Authentication, then URL Configuration.
5. Set Site URL:

```text
https://lillybear8.github.io/anoo-apps/progress_log/
```

6. Add Redirect URLs:

```text
http://localhost:5173/progress_log/
https://lillybear8.github.io/anoo-apps/progress_log/
```

The frontend uses the Supabase publishable key. That key is safe to ship in this static app only because Row Level Security in `supabase/schema.sql` restricts every exercise and entry row to the signed-in user.

## Local Mac Preview

From the `anoo-apps` repo root, run:

```sh
python3 -m http.server 5173
```

Open the app directly:

```text
http://localhost:5173/progress_log/
```

Localhost is enough for development. Exercise data now comes from Supabase, so the app needs network access after sign-in.

## GitHub Pages Setup

1. Create a new public GitHub repo.
2. Commit and push these files to the repo.
3. In GitHub, open the repo settings.
4. Go to Pages.
5. Set the source to the `main` branch and the repository root.
6. Open the published URL:

```text
https://<username>.github.io/anoo-apps/progress_log/
```

The repo root also redirects to Progress Log:

```text
https://<username>.github.io/anoo-apps/
```

GitHub Pages serves static HTML, CSS, and JavaScript over HTTPS. On GitHub Free, Pages uses public repositories. The repo contains app code only; your workout data is stored in Supabase.

GitHub Pages reference: https://docs.github.com/articles/user-organization-and-project-pages

## Install On iPhone

1. Open the GitHub Pages URL in Safari on your iPhone.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Launch Progress Log once while online so the offline files can cache.
5. Use the new Home Screen icon at the gym.

Apple guide: https://support.apple.com/en-euro/guide/iphone/iphea86e5236/ios

## Data And Backup

- Workout data is stored in Supabase under your signed-in user.
- Use Export to save a JSON backup to Files or iCloud Drive.
- Use Import to replace your current Supabase data with a previous JSON export.
- Import deletes the current signed-in account's Progress Log data before restoring the backup.

Service worker reference: https://developer.mozilla.org/docs/Web/API/Service_Worker_API

## Files

- `index.html` - app shell and PWA metadata.
- `styles.css` - dark mobile-first UI.
- `app.js` - Supabase auth, remote data model, tags, ordering, rendering, import/export, and interactions.
- `manifest.webmanifest` - install metadata.
- `service-worker.js` - offline app shell cache.
- `assets/` - app icons.
