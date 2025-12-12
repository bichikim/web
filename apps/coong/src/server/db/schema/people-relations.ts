import {relations} from 'drizzle-orm'
import {people} from './people'
import {anniversaryPeople} from './anniversary-people'
import {profiles} from './profiles'

export const peopleRelations = relations(people, ({one, many}) => ({
  anniversaryPeople: many(anniversaryPeople),
  owner: one(profiles, {
    fields: [people.ownerId],
    references: [profiles.id],
  }),
  profile: one(profiles, {
    fields: [people.id],
    references: [profiles.personId],
  }),
}))
