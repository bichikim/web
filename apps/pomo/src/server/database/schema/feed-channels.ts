import {boolean, pgTable, text, timestamp, uuid, varchar} from 'drizzle-orm/pg-core'

export const feedChannels = pgTable('feed_channels', {
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  description: text().notNull(),
  enabled: boolean().notNull().default(true),
  id: uuid().primaryKey().defaultRandom(),
  language: varchar({length: 16}).notNull(),
  slug: varchar({length: 64}).notNull().unique(),
  title: text().notNull(),
  updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
})
