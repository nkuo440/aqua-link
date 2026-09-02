# Aqua Link cloud setup

The front end can run on GitHub Pages, but GitHub Pages itself is static hosting and does not provide a server-side database. Aqua Link therefore uses Supabase for authentication and PostgreSQL data storage. Supabase's browser client supports persisted sessions and database queries. See the official docs: https://supabase.com/docs/reference/javascript/initializing

## 1. Create the project

Create a Supabase project, then open its SQL Editor.

## 2. Create the tables

Paste and run `supabase/schema.sql`.

The schema uses Row Level Security. Learners can manage their own profile and create reports, while network reports can be read by authenticated users. Staff status-management policies should be added only for verified teacher/mentor/admin accounts.

## 3. Add the browser keys

Open `config.js` and replace:

- `YOUR_PROJECT_URL` with the Supabase project URL.
- `YOUR_PUBLISHABLE_OR_ANON_KEY` with the project's publishable/anon key.

Never put a `service_role` key in the website.

## 4. Configure authentication

In Supabase Authentication, enable Email/Password. Set the site's URL to the GitHub Pages URL for the repository and configure email confirmation according to the project's safeguarding requirements.

## 5. Test

1. Open Aqua Link.
2. Select **Sign in**.
3. Create a test account.
4. Sign in.
5. Submit a report.
6. Refresh the page or open the site on another device.
7. Confirm the profile/report is still present.

## Privacy design

For a school/learner project, keep the profile deliberately minimal. Do not collect a learner's home address, date of birth, phone number, school ID number, or other unnecessary sensitive information. Use a display name or approved school identifier instead.

## Important hosting note

GitHub Pages is appropriate for the static front end, but it is not a server-side application host. Keep database/authentication logic in Supabase and only expose the browser-safe publishable/anon key in the front end. GitHub Pages documentation confirms that it publishes static files and does not support server-side languages such as PHP, Ruby or Python.
