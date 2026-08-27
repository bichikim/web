import {getTableName} from 'drizzle-orm'
import {getTableConfig} from 'drizzle-orm/pg-core'
import {describe, expect, it, vi} from 'vitest'

import {anniversaryPeople} from '../schema/anniversary-people'
import {musicPostComments, musicPosts} from '../schema/music-posts'
import {peopleRelations} from '../schema/people-relations'
import {people} from '../schema/people'
import {profiles} from '../schema/profiles'
import {userAnniversaries} from '../schema/user-anniversaries'
import {userRoles} from '../schema/user-roles'

describe('database schema', () => {
  it.each([
    [anniversaryPeople, 'anniversary_people'],
    [musicPosts, 'music_posts'],
    [musicPostComments, 'music_posts_comments'],
    [people, 'people'],
    [profiles, 'profiles'],
    [userAnniversaries, 'user_anniversaries'],
    [userRoles, 'user_roles'],
  ] as const)('should define the expected table and policies', (table, tableName) => {
    const config = getTableConfig(table)

    expect(getTableName(table)).toBe(tableName)
    expect(config.columns.length).toBeGreaterThan(0)
    expect(config.policies.length).toBeGreaterThan(0)
  })

  it('should expose people relations', () => {
    const one = vi.fn(() => ({withFieldName: (name: string) => ({kind: 'one', name})}))
    const many = vi.fn(() => ({withFieldName: (name: string) => ({kind: 'many', name})}))

    expect(peopleRelations.config({many, one} as never)).toEqual({
      anniversaryPeople: {kind: 'many', name: 'anniversaryPeople'},
      owner: {kind: 'one', name: 'owner'},
      profile: {kind: 'one', name: 'profile'},
    })
    expect(many).toHaveBeenCalledWith(anniversaryPeople)
    expect(one).toHaveBeenCalledTimes(2)
  })
})
