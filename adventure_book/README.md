# Our Adventure Book

A shared digital scrapbook app hosted on GitHub Pages and backed by Supabase Auth, Postgres, and private Storage.

The app keeps the original scrapbook and Instagram-style entry UI, but data now lives in Supabase instead of local SQLite. Signed-in book members can view and edit the same shared book. Photos are stored in a private Supabase Storage bucket and rendered with signed URLs.

## Supabase Setup

1. Open the same Supabase project used by The Dojo:

```text
https://dyxqnvokqpwxgtqothcr.supabase.co
```

2. Open SQL Editor.
3. Paste and run:

```text
../supabase/adventure_book_schema.sql
```

This creates Adventure Book tables, invite functions, Row Level Security policies, and the private `adventure-book-photos` Storage bucket.

4. Open Authentication, then URL Configuration.
5. Set Site URL:

```text
https://lumberbear.github.io/public_lumber/adventure_book/
```

6. Add Redirect URLs:

```text
http://localhost:5173/public_lumber/adventure_book/
https://lumberbear.github.io/public_lumber/adventure_book/
```

The frontend uses the Supabase publishable key. That key is safe to ship because table and Storage RLS restrict data to authenticated members of each shared book.

## Local Preview

From this directory:

```sh
npm install
npm run dev
```

Open:

```text
http://localhost:5173/public_lumber/adventure_book/
```

First run flow:

1. Register or sign in.
2. Create a shared book.
3. Use the `Invite` control to copy an invite link.
4. Open the invite link from another account to join the same book.

## GitHub Pages

Adventure Book is built by the repository workflow:

```text
.github/workflows/pages.yml
```

In GitHub, open repo Settings, then Pages, and set Source to:

```text
GitHub Actions
```

Pushing to `main` builds `adventure_book` and publishes it at:

```text
https://lumberbear.github.io/public_lumber/adventure_book/
```

The workflow also keeps the existing static root and `the_dojo/` Pages output.

## Import Existing Data

The importer uses the Supabase service role key locally. Do not commit or expose that key.

Set environment variables:

```sh
export SUPABASE_URL=https://dyxqnvokqpwxgtqothcr.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Import an old local SQLite `data/` folder:

```sh
npm run import:local -- /path/to/adventure_book/data --book-id <book-uuid> --user-id <owner-user-uuid>
```

Import a prototype JSON export:

```sh
npm run import:json -- /path/to/adventure_book_export.json --book-id <book-uuid> --user-id <owner-user-uuid>
```

The importer creates the target book if it does not exist, ensures the supplied user is an owner, uploads photos to Storage, and upserts entries/settings.

## Notes

- AI palette generation is disabled in this static deployment. Manual/default themes still work.
- PDF export still runs in the browser with `html2canvas` and `jspdf`.
- The Vite build uses `base: "/public_lumber/adventure_book/"`, so local preview should use the same subpath as GitHub Pages.
