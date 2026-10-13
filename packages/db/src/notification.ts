/**
 * A member's notifications, as the apps consume them. Rows come from the
 * `notification_feed` view, which already carries the names needed to print each one.
 */
import { NOTIFICATION_TYPES } from "@espressoir/core";
import { z } from "zod";

export const notificationRowSchema = z
  .object({
    notification_id: z.uuid(),
    type: z.enum(NOTIFICATION_TYPES),
    created_at: z.string(),
    read_at: z.string().nullable(),
    actor_username: z.string().min(1),
    actor_display_name: z.string().nullable(),
    tasting_id: z.uuid().nullable(),
    brand_name: z.string().nullable(),
    coffee_name: z.string().nullable(),
    comment_id: z.uuid().nullable(),
    comment_excerpt: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.notification_id,
    type: row.type,
    createdAt: row.created_at,
    read: row.read_at !== null,
    actor: { username: row.actor_username, displayName: row.actor_display_name },
    /** The tasting it is about; null for a new follower. */
    tasting:
      row.tasting_id && row.brand_name && row.coffee_name
        ? { id: row.tasting_id, brandName: row.brand_name, coffeeName: row.coffee_name }
        : null,
    /** The first words of the comment or reply. */
    excerpt: row.comment_excerpt,
  }));

export type Notification = z.infer<typeof notificationRowSchema>;
