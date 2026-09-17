/** @vitest-environment node */
import {expect, it} from 'vitest'

import {paginate} from '../paginate'

it('should report a complete result after exhausting every cursor page', async () => {
  const cursors: Array<string | null> = []
  const result = await paginate<string, string>({
    loadPage: async (cursor) => {
      cursors.push(cursor)
      return cursor === null
        ? {items: ['first'], nextCursor: 'next'}
        : {items: ['second'], nextCursor: null}
    },
    maximumItems: 2,
    maximumPages: 2,
  })

  expect(result).toEqual({items: ['first', 'second'], truncated: false})
  expect(cursors).toEqual([null, 'next'])
})

it('should report truncation when the page limit leaves a cursor', async () => {
  const loadPage = async () => ({items: ['first'], nextCursor: 'next'})

  await expect(
    paginate<string, string>({loadPage, maximumItems: 2, maximumPages: 1}),
  ).resolves.toEqual({items: ['first'], truncated: true})
})

it('should report truncation when normalized page items exceed the item limit', async () => {
  await expect(
    paginate<string, string>({
      loadPage: async () => ({items: ['first', 'second', 'third'], nextCursor: null}),
      maximumItems: 2,
      maximumPages: 2,
    }),
  ).resolves.toEqual({items: ['first', 'second'], truncated: true})
})
