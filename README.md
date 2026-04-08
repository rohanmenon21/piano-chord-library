# Piano Chord Library

A hosted piano chord web app with private user accounts, per-user song libraries, URL import, transposition, delete/undo, and interactive chord voicing previews.

## Stack

- Frontend: static HTML/CSS/JS
- Auth + Database: Supabase
- Hosting: Vercel
- Runtime config: `/api/config` Vercel serverless function

## Features

- Email/password sign-up and sign-in
- Private per-user song libraries
- Song editing, preview, transposition, delete/undo
- Setlists with separate browse/edit/preview flows
- Performance mode for live playback
- URL import for supported song pages
- Hover chord previews with alternate voicings
- Search and sort for songs and setlists
- In-app help and instructions
- Profile page with display name and sign-out

## Documentation

If you want to understand the app more deeply, start here:

- [`docs/overview.md`](docs/overview.md) for a beginner-friendly explanation of what the app is and how the major parts fit together
- [`docs/architecture.md`](docs/architecture.md) for the file-by-file architecture and dependency map
- [`docs/glossary.md`](docs/glossary.md) for plain-English definitions of technical and musical terms

## Supabase Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run [`supabase/schema.sql`](/Users/rohanmenon/Documents/New project/supabase/schema.sql).
3. In Supabase Auth, enable email/password sign-in.
4. Copy your project URL and anon key.

## Vercel Setup

1. Import this project into Vercel.
2. Add these environment variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Deploy.

The frontend fetches those values from [`api/config.js`](/Users/rohanmenon/Documents/New project/api/config.js).

## Local Development

This project is validated against Node 24 LTS.

1. Create a local [`.env`](/Users/rohanmenon/Documents/Development/piano-chord-library/.env) file from [`.env.example`](/Users/rohanmenon/Documents/Development/piano-chord-library/.env.example) and fill in your Supabase URL and anon key.
2. Run the app through a web server or Vercel dev, not by opening `index.html` directly from `file://`.
3. Add `?mock=1` to the URL if you want to run the app against seeded in-memory data instead of Supabase.

## Smoke Tests

1. Install dev dependencies with `npm install`.
2. Start the app with `npm run dev`.
3. Run the browser smoke suite with `npm run test:smoke`.

## Notes

- Existing browser `localStorage` song data is not migrated into hosted accounts.
- Song data is private by default through Supabase Row Level Security.
- Chord voicing popup preferences still persist locally per browser.
