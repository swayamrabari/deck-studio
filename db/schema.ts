import {
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Storage: Postgres (Supabase). Table/column names are unchanged from the
 * SQLite v1 schema, so the one-off importer (scripts/migrate-sqlite-to-pg)
 * copies rows 1:1.
 */

/** Raw binary column — deck media blobs (up to 8 MB each). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // sha256 of the opaque token in the user's cookie — never the raw token.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // User deletion cascades and expired-session sweeps.
    index("sessions_user_id_idx").on(table.userId),
  ]
);

export const decks = pgTable(
  "decks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Covers the dashboard's hottest query:
    // WHERE owner_id = ? ORDER BY updated_at DESC.
    index("decks_owner_updated_idx").on(table.ownerId, table.updatedAt),
  ]
);

export const deckFiles = pgTable(
  "deck_files",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    /** Path within the deck, e.g. "deck/01-title/page.tsx". */
    path: text("path").notNull(),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("deck_files_deck_path_unique").on(table.deckId, table.path),
  ]
);

/**
 * Deck media (images and other binary assets) — stored in the DB so a deck
 * is fully portable, served at /api/decks/<id>/media/<name>.
 */
export const deckMedia = pgTable(
  "deck_media",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    bytes: bytea("bytes").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("deck_media_deck_name_unique").on(table.deckId, table.name),
  ]
);

export type User = typeof users.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type DeckFile = typeof deckFiles.$inferSelect;
export type DeckMedia = typeof deckMedia.$inferSelect;
