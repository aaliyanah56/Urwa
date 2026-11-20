# URWA Supabase migration status

## Migrated to Supabase
- Browser authentication: student registration, student/teacher/admin sign-in, role and approval checks, logout, email verification, password reset.
- Student dashboard data: enrolment, attendance summary, assignments, Hifdh and Muraja’ah counts.
- Teacher dashboard data/actions: assigned halaqas, approved student roster, assignment creation, attendance recording.
- Admin dashboard data/actions: student admissions, profile approval, halaqa assignment, teacher assignment, announcements.
- Department tracker: department memberships, goals, reports, goal status updates and report review.

## Important
- All migrated operations use the existing Supabase project and existing tables.
- Existing Supabase records were not dropped, reset, or recreated.
- The legacy Firebase configuration and Firestore rules remain in the repository as migration history/reference; migrated dashboard/auth scripts no longer import them.
- Public pages are imported. Binary image assets (`assets/logo.jpg` and `assets/event calender.jpg`) still need a binary-safe transfer from the legacy repository.
- Staff accounts must be provisioned by a trusted administrator. Public student registration only creates the pending student role via the existing database trigger.
- Browser code uses only the publishable key; never put a service-role or secret key in the repository.

## Before production
1. Verify Supabase Auth Site URL and redirect allow-list for the live URWA domain and local development.
2. Test student sign-up and email verification, approval, all role logins, password reset, attendance, assignments, announcements and department access.
3. Review Supabase security advisor findings, especially callable SECURITY DEFINER helpers and leaked-password protection.
4. Test all flows against the deployed Cloudflare site and confirm image assets are present.
