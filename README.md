# Attendance Recording App (Supabase online)

## Included
- Sign-in with Supabase Auth
- Student directory (add/delete)
- Daily attendance statuses: Present, Absent, Late, Excused
- Attendance saved online in Supabase
- Dashboard totals and daily attendance rate
- Date-based report

## Setup (beginner-friendly)
1. Visit https://supabase.com and create a project.
2. In the project, open **SQL Editor**, create a query, paste `supabase_schema.sql`, and run it.
3. Open **Project Settings > API**. Copy the Project URL and the `anon` / publishable key.
4. In `app.js`, replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_PUBLIC_KEY` with the copied values. Do not put a service-role key in the browser.
5. In Supabase **Authentication > Users**, create an admin user with email and password. (For a real deployment, configure email confirmation and secure admin access.)
6. Test by opening `index.html` through a local web server, not by double-clicking it. You can use VS Code Live Server.
7. To put it online: upload these files to a static host such as Netlify, Vercel, or GitHub Pages. Supabase remains the online database.

## Security note
This starter uses policies that allow any signed-in user to manage all students and attendance. For a school deployment with multiple staff/schools, add organization/role-based policies before using real student data. Keep the Supabase anon/publishable key only; never expose the service-role key.

## Troubleshooting
- "Setup required": API URL/key were not filled in.
- Login fails: ensure the Auth user exists and email/password are correct.
- Table errors: rerun SQL and confirm tables exist in public schema.
