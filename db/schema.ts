import {
  blob,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * v1 storage (SQLite). The schema is deliberately portable — the same
 * table definitions map to Postgres when the platform outgrows v1.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // sha256 of the opaque token in the user's cookie — never the raw token.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const deckFiles = sqliteTable(
  "deck_files",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    /** Path within the deck, e.g. "deck/01-title/page.tsx". */
    path: text("path").notNull(),
    content: text("content").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("deck_files_deck_path_unique").on(table.deckId, table.path),
  ],
);

/**
 * Deck media (images and other binary assets) — stored in the DB so a deck
 * is fully portable, served at /api/decks/<id>/media/<name>.
 */
export const deckMedia = sqliteTable(
  "deck_media",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    bytes: blob("bytes", { mode: "buffer" }).notNull(),
    size: integer("size").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("deck_media_deck_name_unique").on(table.deckId, table.name),
  ],
);

export type User = typeof users.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type DeckFile = typeof deckFiles.$inferSelect;
export type DeckMedia = typeof deckMedia.$inferSelect;
