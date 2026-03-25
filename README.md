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
- URL import for supported song pages
- Hover chord previews with alternate voicings
- Profile page with display name and sign-out

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

1. Copy [`.env.example`](/Users/rohanmenon/Documents/New project/.env.example) values into your Vercel/local environment setup.
2. Run the app through a web server or Vercel dev, not by opening `index.html` directly from `file://`.

## Notes

- Existing browser `localStorage` song data is not migrated into hosted accounts.
- Song data is private by default through Supabase Row Level Security.
- Chord voicing popup preferences still persist locally per browser.
