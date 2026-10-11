import type { Route } from "next";

export function coffeePath(brandSlug: string, coffeeSlug: string): Route {
  return `/kahve/${brandSlug}/${coffeeSlug}` as Route;
}

export function brandPath(brandSlug: string): Route {
  return `/marka/${brandSlug}` as Route;
}

export function profilePath(username: string): Route {
  return `/u/${username}` as Route;
}
