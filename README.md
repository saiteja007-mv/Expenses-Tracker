# Expense Tracker — Setup

## Prereqs
- Supabase project (Auth + Database + Storage)
- Google Cloud service account with Sheets API enabled
- Vercel account

## Steps
1. **Clone** this project structure into a new Next.js app.
2. **Install** deps: `npm i` (or `pnpm i` / `yarn`).
3. **Supabase**: In SQL editor, run `supabase/schema.sql` then `supabase/policies.sql`. Create private Storage bucket `receipts`.
4. **Auth**: In Supabase > Auth > Providers, enable **Google** and configure OAuth.
5. **Sheets**: Create a Google Sheet with tab `Transactions`. Share with your service account email.
6. **Env**: Copy `.env.example` to `.env.local` and fill values.
7. **Dev**: `npm run dev` and open http://localhost:3000
8. **Deploy**: Push to GitHub, import on **Vercel**, set env vars, deploy.

## Notes
- All API writes also sync to Google Sheets (row ID stored in `sheet_row_id`).
- Images upload privately to Supabase Storage; UI uses signed URLs.
- Export button downloads XLSX locally. For Excel real-time sync, we can add Microsoft Graph later. 