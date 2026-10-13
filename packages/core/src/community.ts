/**
 * Comments and reports: the value sets and limits the database enforces (a database test
 * keeps the enums in step), shared so forms can answer before a round trip.
 */
export const COMMENT_MAX_LENGTH = 2000;

/** What a report can be about. */
export const REPORT_TARGETS = ["tasting", "comment", "profile", "coffee", "list"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = ["spam", "abuse", "wrong_info", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_DETAILS_MAX_LENGTH = 1000;
export const MODERATION_NOTE_MAX_LENGTH = 500;

/** Lists: a member's named collections of coffees. The database enforces all of these. */
export const LIST_TITLE_MAX_LENGTH = 80;
export const LIST_DESCRIPTION_MAX_LENGTH = 500;
export const LIST_NOTE_MAX_LENGTH = 280;
export const LISTS_PER_MEMBER_MAX = 50;
export const LIST_ITEMS_MAX = 100;

/** How long an admin can restrict a member for, in days (the choices the panel offers). */
export const RESTRICTION_DAYS = [1, 7, 30] as const;
