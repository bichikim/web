import {pgPolicy, pgTable, primaryKey, uuid} from 'drizzle-orm/pg-core'
import {relations, sql} from 'drizzle-orm'
import {authenticatedRole} from 'drizzle-orm/supabase'
import {people} from './people'
import {userAnniversaries} from './user-anniversaries'

export const anniversaryPeople = pgTable(
  'anniversary_people',
  {
    anniversaryId: uuid()
      .notNull()
      .references(() => userAnniversaries.id, {onDelete: 'cascade'}),
    personId: uuid()
      .notNull()
      .references(() => people.id, {onDelete: 'cascade'}),
  },
  (table) => [
    primaryKey({columns: [table.anniversaryId, table.personId]}),
    // RLS policy for insert: only allow if anniversary ownerId matches auth.uid()
    pgPolicy('anniversary_people_insert_policy', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM ${userAnniversaries}
        WHERE ${userAnniversaries.id} = ${table.anniversaryId}
        AND ${userAnniversaries.ownerId} = (select auth.uid())
      )`,
    }),
    // RLS policy for update: only allow if anniversary ownerId matches auth.uid()
    pgPolicy('anniversary_people_update_policy', {
      for: 'update',
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM ${userAnniversaries}
        WHERE ${userAnniversaries.id} = ${table.anniversaryId}
        AND ${userAnniversaries.ownerId} = (select auth.uid())
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM ${userAnniversaries}
        WHERE ${userAnniversaries.id} = ${table.anniversaryId}
        AND ${userAnniversaries.ownerId} = (select auth.uid())
      )`,
    }),
    // RLS policy for delete: only allow if anniversary ownerId matches auth.uid()
    pgPolicy('anniversary_people_delete_policy', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM ${userAnniversaries}
        WHERE ${userAnniversaries.id} = ${table.anniversaryId}
        AND ${userAnniversaries.ownerId} = (select auth.uid())
      )`,
    }),
    // RLS policy for select: only allow if anniversary ownerId matches auth.uid()
    pgPolicy('anniversary_people_select_policy', {
      for: 'select',
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM ${userAnniversaries}
        WHERE ${userAnniversaries.id} = ${table.anniversaryId}
        AND ${userAnniversaries.ownerId} = (select auth.uid())
      )`,
    }),
  ],
).enableRLS()

export const anniversaryPeopleRelations = relations(anniversaryPeople, ({one}) => ({
  anniversary: one(userAnniversaries, {
    fields: [anniversaryPeople.anniversaryId],
    references: [userAnniversaries.id],
  }),
  person: one(people, {
    fields: [anniversaryPeople.personId],
    references: [people.id],
  }),
}))
