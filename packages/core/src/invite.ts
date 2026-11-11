/**
 * Invitation requests: what a visitor leaves while signup is closed. Postgres is the
 * authority (the table's checks and its trigger); these copies let the form answer before
 * a round trip, and a database test keeps the two in step.
 */
export const INVITE_REQUEST_STATUSES = ["pending", "invited", "dismissed"] as const;
export type InviteRequestStatus = (typeof INVITE_REQUEST_STATUSES)[number];

export const INVITE_EMAIL_MAX_LENGTH = 254;
export const INVITE_NOTE_MAX_LENGTH = 500;
