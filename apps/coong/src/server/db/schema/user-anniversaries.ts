import {boolean, date, integer, pgPolicy, pgTable, text, uuid} from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import {authenticatedRole} from 'drizzle-orm/supabase'
import {timestamps} from '../fragments'
import {profiles} from './profiles'
import {createOwnerOnlyCondition} from '../policies'
import {anniversaryPeople} from './anniversary-people'

export type AnniversaryRepeatType = 'none' | 'yearly' | 'monthly'

export const userAnniversaries = pgTable(
  'user_anniversaries',
  {
    date: date().notNull(),
    description: text(),
    id: uuid().primaryKey().defaultRandom(),
    isLunar: boolean().notNull().default(false),
    ownerId: uuid()
      .notNull()
      .references(() => profiles.id, {onDelete: 'cascade'}),
    remindDaysBefore: integer(),
    repeatType: text().notNull().$type<AnniversaryRepeatType>().default('yearly'),
    title: text().notNull(),
    ...timestamps,
  },
  (table) => [
    // RLS policy for insert: only allow if ownerId matches auth.uid()
    pgPolicy('user_anniversaries_insert_policy', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: createOwnerOnlyCondition(table, 'ownerId'),
    }),
    // RLS policy for update: only allow if ownerId matches auth.uid()
    pgPolicy('user_anniversaries_update_policy', {
      for: 'update',
      to: authenticatedRole,
      using: createOwnerOnlyCondition(table, 'ownerId'),
      withCheck: createOwnerOnlyCondition(table, 'ownerId'),
    }),
    // RLS policy for delete: only allow if ownerId matches auth.uid()
    pgPolicy('user_anniversaries_delete_policy', {
      for: 'delete',
      to: authenticatedRole,
      using: createOwnerOnlyCondition(table, 'ownerId'),
    }),
    // RLS policy for select: only allow owner to read their anniversaries
    pgPolicy('user_anniversaries_select_policy', {
      for: 'select',
      to: authenticatedRole,
      using: createOwnerOnlyCondition(table, 'ownerId'),
    }),
  ],
).enableRLS()

export const userAnniversariesRelations = relations(userAnniversaries, ({one, many}) => ({
  owner: one(profiles, {
    fields: [userAnniversaries.ownerId],
    references: [profiles.id],
  }),
  people: many(anniversaryPeople),
}))
