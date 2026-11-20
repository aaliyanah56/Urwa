# Supabase migration status

The legacy URWA website and portal source has been imported from the original `aaliyanah56/Urwa` repository.

## Important
- Public website pages, stylesheets, scripts, portal HTML, and Firebase-era backend files are included as a source baseline.
- The legacy portal backend files (`js/firebase.js`, `js/firebase-auth.js`, `js/dashboard-data.js`, and `js/department-tracker.js`) still use Firebase. They are retained for reference and are **not yet migrated to Supabase**.
- The existing Supabase client in `js/supabase.js` remains the intended backend connection for the migration.
- Existing Supabase project data must be preserved. Do not drop, reset, or recreate its tables.
- Binary image assets were not copied in this transfer. The two original files remain in `assets/` in the legacy repository and must be copied as binary files before local image paths will resolve.

## Remaining migration work
1. Copy `assets/logo.jpg` and `assets/event calender.jpg` from the legacy repository.
2. Replace Firebase authentication with Supabase Auth.
3. Migrate dashboard and department queries to the existing Supabase schema.
4. Verify RLS policies and profile/role creation before enabling portal actions.
5. Test public pages and each role's sign-in/dashboard before production promotion.
