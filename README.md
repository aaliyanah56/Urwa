# URWA — Urwatul Wuthqaa

**The Firmest Handhold**

URWA is an Islamic learning and community platform for students, Ablas (teachers), administrators and the wider community.

## Current migration target

- **Frontend repository:** `aaliyanah56/urwatul-wuthqa`
- **Backend:** existing Supabase project `urwa`
- **Supabase URL:** `https://kwqaorzvflrgepepfwwg.supabase.co`
- **Client key:** publishable key (browser-safe; never use a service-role key in frontend code)
- **Hosting target:** Cloudflare Pages

## Migration status

This repository was initially empty. The existing URWA website and portal implementation is in the separate `aaliyanah56/Urwa` repository and currently uses Firebase. The application must be migrated feature-by-feature to Supabase before it is deployed from this repository.

The existing Supabase project already contains the core URWA data model, including profiles, student enrollments, halaqas, teacher assignments, attendance, assignments, submissions, announcements, Hifdh and Muraja'ah records, and department management tables. Existing records must be preserved.

## Security requirements

- Use Supabase Auth for browser sign-in and registration.
- Use the `profiles` table for role and approval status.
- Keep Row Level Security enabled on every user-facing table.
- Never allow public registration to assign privileged roles.
- Never put a Supabase service-role key, database password, or other secret in frontend code.
- Test student, teacher and admin access separately before production deployment.

## Supabase client

The browser client is initialized in `js/supabase.js` using the project URL and publishable key. This file alone does not migrate the Firebase-powered application; portal workflows still need to be ported and tested.

## Deployment

Configure Cloudflare Pages to deploy the `main` branch. For a plain HTML/CSS/JavaScript site, use no build command and the repository root as the output directory.
