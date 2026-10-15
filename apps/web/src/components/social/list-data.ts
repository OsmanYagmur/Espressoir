/**
 * What the buttons on a coffee's page need to know about the person looking at it: whether
 * the coffee is on their "want to try" list, and which of their lists hold it. Read in the
 * browser, straight from Supabase (the query is shared with the mobile app).
 *
 * Loaded on demand, like the other social data: visitors never download it.
 */
import { loadCoffeeShelf as loadShelf, type CoffeeShelf } from "@espressoir/db";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export type { CoffeeShelf, ShelfList as MyList } from "@espressoir/db";

/** Null when nobody is signed in on this browser after all. */
export async function loadCoffeeShelf(coffeeId: string): Promise<CoffeeShelf | null> {
  const supabase = getBrowserSupabase();
  const { data: session } = await supabase.auth.getSession();
  const viewer = session.session?.user.id;
  if (!viewer) return null;
  return loadShelf(supabase, viewer, coffeeId);
}
