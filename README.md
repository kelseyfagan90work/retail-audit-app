# Retail Audit App

Checklist-style store audits for your auditing team — open an audit against
a store, answer Yes/No/N-A per question, attach photos and notes, complete
it to get a score, and email the report to the store's manager. Templates
are fully editable, and editing one never changes audits already in
progress or completed (each audit snapshots its questions when it starts).

Same free stack as the display-review project: **Vercel** (hosting + API)
and **Supabase** (auth, database, photo storage), plus **Resend** (free
tier) for sending report emails.

## How scoring works

Each question is Yes / No / N/A. The audit's overall score is:

```
score = (# of "Yes" answers) / (# of "Yes" + "No" answers) × 100
```

N/A and unanswered questions are excluded entirely — they don't drag the
score down or up. A question can't be left unanswered when you complete an
audit; N/A is how you skip something that doesn't apply.

## Roles

Two roles, set in the `profiles` table:

- **auditor** — can start audits, answer questions, complete audits, view
  reports.
- **admin** — everything an auditor can do, plus editing templates and
  managing the store list.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or reuse one
   you already have — this app's tables are independent of any other
   project's tables).
2. **SQL Editor** → run everything in `supabase/schema.sql`.
3. **Storage** → create a bucket named exactly `audit-photos`, set it to
   **public**.
4. **Authentication → Providers → Email** → turn off "Confirm email" so you
   can log in immediately after signing up (fine for an internal tool with
   trusted users; turn it back on later if you want).
5. **Settings → API** → copy your **Project URL**, **anon public** key, and
   **service_role** key.

## 2. Set up Resend (for emailing reports)

1. Sign up free at [resend.com](https://resend.com) — no credit card
   needed for the free tier (100 emails/day, 3,000/month).
2. **API Keys** → create a key, copy it.
3. For quick testing, you can send from `onboarding@resend.dev` with no
   further setup — that's the default in `.env.local.example`. To send
   from your own domain (e.g. `audits@yourcompany.com`), verify that
   domain under **Domains** in Resend first, then use that address instead.

You can skip this step and add it later — everything else works without
it, and the "Send report" button will just show an error until it's set.

## 3. Run it locally

```bash
npm install
cp .env.local.example .env.local
# fill in your Supabase URL/keys and Resend key
npm run dev
```

Open `http://localhost:3000`, sign up with your email, then in Supabase:
**Table Editor → profiles → Insert row**:
- `id`: your user's UID (from **Authentication → Users**)
- `email` / `display_name`: yours
- `role`: `admin` (start as admin so you can build a template)

## 4. Build your first audit template

Once you're in as admin:
1. Go to **Stores**, add at least one store (with a manager email if you
   want to test the report-sending feature).
2. Go to **Templates**, create a template, add a section (e.g. "Front of
   Store"), and add a few questions to it.
3. Go to **Audits → Start new audit**, pick your store and template, and
   walk through answering questions, adding a note, and attaching a photo.
4. **Complete audit**, then try **Send report to store** if you set a
   manager email.
5. Complete a couple more audits (even backdated ones aren't necessary —
   just a few in the same month) and check **Reports** to see the trend
   chart and store comparison populate.

## 5. Deploy for free on Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Add the same environment variables from `.env.local` in the project
   settings (Supabase URL/keys, Resend key, report from-address).
4. Deploy. You'll get a live `https://...vercel.app` URL.

## What's intentionally left simple (next steps)

- **No automatic monthly email digest yet** — "Reports" is a live page you
  check, not a scheduled email. Vercel Cron (free tier includes it) could
  trigger a monthly summary email pulling from `/api/reports/trend` if you
  want that later.
- **No drag-and-drop reordering** for template sections/questions — new
  ones go at the end. Reordering would mean adding a numeric "move up/down"
  control or a drag library.
- **No corrective-action tracking** — failed items show up in the report
  email, but there's no built-in workflow for the store to mark something
  fixed and have it reflected back in the app. Worth adding if that
  loop matters to you.
- **Single flat question type** (Yes/No/N/A). If you later want a 1-5
  rating scale or multiple choice on top of this, the `audit_questions`
  table would need an `answer_type` column and the scoring function would
  need to handle each type differently.
