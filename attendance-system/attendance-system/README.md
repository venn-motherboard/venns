# Attendance Monitor (Next.js + Supabase + Web NFC)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. In Supabase > Authentication: add professor users manually and turn off "Allow new users to sign up".
5. `npm run dev` (Web NFC needs HTTPS and Chrome on Android, so test on the Vercel deployment).
6. Deploy: push to GitHub, import in Vercel, add the two env vars.
