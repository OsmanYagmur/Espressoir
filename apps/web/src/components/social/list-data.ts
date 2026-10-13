/**
 * What the buttons on a coffee's page need to know about the person looking at it: whether
 * the coffee is on their "want to try" list, and which of their lists hold it. Read in the
 * browser, straight from Supabase (row level security shows a member their own rows).
 *
 * Loaded on demand, like the other social data: visitors never download it.
 */
import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface MyList {
  id: string;
  title: string;
  isPublic: boolean;
  /** This coffee is on the list. */
  has: boolean;
}

export interface CoffeeShelf {
  wantsToTry: boolean;
  lists: MyList[];
}

/** Null when nobody is signed in on this browser after all. */
export async function loadCoffeeShelf(coffeeId: string): Promise<CoffeeShelf | null> {
  const supabase = getBrowserSupabase();
  const { data: session } = await supabase.auth.getSession();
  const viewer = session.session?.user.id;
  if (!viewer) return null;

  const [wish, lists] = await Promise.all([
    supabase
      .from("tastings")
      .select("id")
      .eq("user_id", viewer)
      .eq("coffee_id", coffeeId)
      .eq("status", "wishlist")
      .limit(1),
    // Every list of mine; the embedded entries are narrowed to this coffee, so an empty
    // array means "not on this list".
    supabase
      .from("lists")
      .select("id, title, is_public, list_items(coffee_id)")
      .eq("user_id", viewer)
      .eq("list_items.coffee_id", coffeeId)
      .order("updated_at", { ascending: false }),
  ]);
  if (wish.error || lists.error) throw new Error("shelf");

  return {
    wantsToTry: wish.data.length > 0,
    lists: lists.data.map((list) => ({
      id: list.id,
      title: list.title,
      isPublic: list.is_public,
      has: list.list_items.length > 0,
    })),
  };
}
