# Supabase database setup

The portal dashboard reads `profiles`, `classes`, `rooms`, `invoices`,
`payments`, and `savings_transactions`. Run the SQL migration files, in
timestamp order, in the SQL Editor for the Supabase project configured in
`config.js`:

1. `migrations/20261021000000_portal_schema.sql` creates the portal tables,
   read policies, and profiles for existing and future Auth users.
2. `migrations/20261021000001_fix_authenticated_table_permissions.sql`
   explicitly grants the signed-in `authenticated` role schema usage and
   `SELECT` on those tables.
3. `migrations/20261021000002_admin_access.sql` enables secure admin login
   routing and the administrator policies used by the admin panel.
4. `migrations/20261021000003_student_profile_updates.sql` allows a signed-in
   user to insert or update only their own profile, for the dashboard profile
   form.

The second migration can also be run by itself to repair an existing schema
that already has the tables and row-level security policies. It is safe to run
again. The grants do not bypass row-level security: each student's profile,
invoices, payments, and savings transactions remain limited to their own data.

Adding or running these SQL files in the repository does not apply them to the
hosted Supabase project. After running the SQL, sign out and back in, then
reload the portal. The admin migration grants the panel only its implemented
operations; student access remains restricted by row-level security.

## Account registration

The login page also supports email/password registration:

1. In the Supabase Dashboard, open **Authentication → Sign In / Providers →
   Email** and enable email signups.
2. Open **Authentication → URL Configuration**. Set **Site URL** to the
   deployed portal's base URL and add that URL to the allowed redirect URLs.
3. Keep email confirmation enabled if users should verify their email. The
   confirmation link uses the configured Site URL; users must confirm before
   signing in. If confirmation is disabled, registration signs in immediately.
4. On the portal login page, choose **Daftar**, enter the user's full name,
   email, and matching password (at least 6 characters), then submit.

The profile trigger creates their profile and stores the submitted full name.
To enable students to edit their own name, NIS, and phone number, apply
`migrations/20261021000003_student_profile_updates.sql` as well. Its row-level
security policies restrict writes to the profile whose ID matches the
authenticated user's ID.

## Administrator login

Administrators use the same login form as students. After successful sign-in,
the portal checks `is_portal_admin()` and sends authorized accounts to the
admin panel. Public sign-up never grants administrator access.

To authorize an administrator, first run all three migrations above. Then:

1. Have the person register and confirm their email using the portal.
2. In Supabase, open **Authentication → Users** and copy that user's UUID.
3. In **SQL Editor**, run the following after replacing the example UUID:

   ```sql
   insert into public.portal_admins (user_id)
   values ('00000000-0000-0000-0000-000000000000')
   on conflict (user_id) do nothing;
   ```

4. Ask the administrator to sign out and sign in again. Their login will now
   open the admin panel.

Only a project administrator with SQL Editor access can grant or revoke portal
administrator status. To revoke it, delete that user's row from
`public.portal_admins`.
