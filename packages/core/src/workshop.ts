/**
 * Workshops and the applications to them. The database enforces every one of these (a
 * database test compares the lists with its checks); they are shared so the form can
 * answer before a round trip.
 */

/** How the applicant gets on with coffee: the form's three option cards. */
export const WORKSHOP_EXPERIENCES = ["new", "regular", "home_brewer"] as const;
export type WorkshopExperience = (typeof WORKSHOP_EXPERIENCES)[number];

/** pending → approved / rejected; waitlist when the seats had run out. */
export const WORKSHOP_STATUSES = ["pending", "approved", "rejected", "waitlist"] as const;
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

export const WORKSHOP_NAME_MIN_LENGTH = 2;
export const WORKSHOP_NAME_MAX_LENGTH = 80;
export const WORKSHOP_CONTACT_MIN_LENGTH = 3;
export const WORKSHOP_CONTACT_MAX_LENGTH = 80;
export const WORKSHOP_QUESTION_MAX_LENGTH = 1000;
export const WORKSHOP_TITLE_MAX_LENGTH = 120;
export const WORKSHOP_PRICE_MAX_LENGTH = 120;
export const WORKSHOP_LOCATION_MAX_LENGTH = 120;
export const WORKSHOP_CAPACITY_MAX = 200;

/**
 * A phone number (digits, spaces, "+", "(", ")", "-", at least seven digits) or an
 * Instagram handle ("@" optional; letters, digits, "." and "_", up to 30).
 */
export const WORKSHOP_CONTACT_PATTERN = /^(?:\+?[\d\s()-]*\d[\d\s()-]*|@?[A-Za-z0-9._]{1,30})$/;

export function isWorkshopContact(value: string): boolean {
  const contact = value.trim();
  if (!WORKSHOP_CONTACT_PATTERN.test(contact)) return false;
  return /[A-Za-z]/.test(contact) || contact.replace(/\D/g, "").length >= 7;
}
