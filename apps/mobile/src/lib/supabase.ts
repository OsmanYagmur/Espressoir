import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TypedSupabaseClient } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { env } from "./env";

/**
 * The one Supabase client of the app, with the publishable key and the member's session.
 * The database's rules (RLS, functions) decide everything, exactly as for the website.
 * The session is kept in AsyncStorage and refreshed while the app is in the foreground.
 */
export const supabase: TypedSupabaseClient = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
