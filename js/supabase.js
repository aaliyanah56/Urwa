// URWA Supabase client
// The project URL and publishable key are safe for browser use.
// Keep all service_role keys and database passwords off the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://kwqaorzvflrgepepfwwg.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dr-L_IXcqt1Rw4ROmoH62w_AoTn204K";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
