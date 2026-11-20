# URWA Supabase Auth migration

The browser authentication flows now use the existing Supabase project through `js/supabase.js`.

## Implemented
- Student email/password sign-up using Supabase Auth.
- Student metadata uses the field names expected by the existing `handle_new_user` database trigger.
- Existing database trigger creates a pending student profile and pending enrollment.
- Student, teacher, and administrator login with role and approved-status checks.
- Protected portal-page session/profile checks and logout.
- Password reset email and password update through Supabase Auth.
- No service-role key is used in browser code.

## Important limitations
- Teacher and administrator accounts must be provisioned by an administrator. Public self-registration must not grant either role.
- The existing dashboard data scripts still contain Firebase Firestore queries and are not yet migrated. Until those scripts are converted, authenticated portal pages may load but live dashboard data/actions are not ready.
- Confirm the Supabase Auth Site URL and redirect URL allow-list include the deployed URWA domain and local development URL.
- Test student signup, email confirmation, role approvals, password reset, and each portal login before production.

## Existing database protection
This migration does not modify, truncate, or recreate existing Supabase tables or records.
