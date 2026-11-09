# Daywise — AI Calendar

Daywise is an AI-assisted calendar for turning written requests, voice input, and images into editable calendar events. Users review suggestions before saving them. The calendar supports local use and optional account-based synchronization, without requiring Google Calendar.

**Live demo:** https://daywise-calendar.vercel.app/

## Features

- Draft events from Thai or English text and images with Gemini; review, edit, or remove suggested events before saving.
- Dictate text in browsers that support speech recognition.
- Create, edit and delete events; view calendars by day, week or month and see upcoming events.
- Warn about overlapping events and support tables containing up to 50 events per request.
- Sign in with email and password and synchronize events via Supabase. Local events can be imported explicitly into an account.
- Export and import a JSON backup.

## Current limitations

- **Notifications are not implemented.** Reminder values are stored but do not trigger notifications, including when the site is closed.
- AI results may be incomplete or inaccurate. Users should check event dates and details before saving.
- Images and text submitted for analysis are sent to Gemini; speech recognition may use a browser provider's service.
- Browser-only data can be lost when site data is cleared. Cloud access requires working Supabase settings and an account.
- Public registration requires suitable email delivery and redirect settings. Free-tier quotas and availability apply.

## Technology

Node.js, vanilla JavaScript, Supabase Auth and Postgres with row-level security, Gemini API, and Vercel.

## Run locally

1. Install Node.js 22 or later and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Gemini API key. Never commit `.env.local` or share secret keys.
3. To enable account sync, create a Supabase project, run `supabase/schema.sql` in its SQL Editor, configure Auth email and redirect URLs, and add `SUPABASE_URL` and the **publishable** key to `.env.local`. Never expose the Supabase secret or service-role key in client code.
4. Run `npm start`, then open http://127.0.0.1:3001. Use `npm test` to run the automated tests.

To rebuild the browser SDK bundle after changing its dependency, run `npm run build:client`.

## Security and deployment

The server keeps the Gemini key outside the browser and verifies a Supabase session before accepting AI requests on Vercel. The SQL schema enables row-level security for user-owned events. Review access policies, Auth email delivery, request quotas and abuse protections before opening registration widely. Vercel and Supabase secrets belong in deployment environment settings, not in the repository.
