/**
 * The site's two looks (see globals.css). Which one a visitor sees is their own choice,
 * kept in their browser; `DEFAULT_LOOK` is what everyone else gets.
 */
export const LOOKS = ["sade", "form"] as const;
export type Look = (typeof LOOKS)[number];

export const DEFAULT_LOOK: Look = "sade";
export const LOOK_STORAGE_KEY = "espressoir-look";

/** Inline script for the document head: applies a stored choice before anything is painted. */
export const LOOK_SCRIPT = `try{var l=localStorage.getItem(${JSON.stringify(LOOK_STORAGE_KEY)});if(${LOOKS.map(
  (look) => `l===${JSON.stringify(look)}`,
).join("||")})document.documentElement.dataset.look=l}catch(e){}`;
