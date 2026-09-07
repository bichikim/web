import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {feedChannels} from '../feed-channels'

it('should expose the feed channel schema', () => {
  const config = getTableConfig(feedChannels)

  expect(config.name).toBe('feed_channels')
  expect(config.columns.map((column) => column.name)).toEqual([
    'createdAt',
    'description',
    'enabled',
    'id',
    'language',
    'slug',
    'title',
    'updatedAt',
  ])
})
