import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

/**
 * A Supabase client typed against our schema. Query helpers in this package accept any
 * such client (server, browser, or later React Native), so they stay framework-agnostic.
 */
export type TypedSupabaseClient = SupabaseClient<Database>;
