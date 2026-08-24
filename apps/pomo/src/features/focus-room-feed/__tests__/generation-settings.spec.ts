import {expect, it, vi} from 'vitest'

import {resolveGenerationSettings} from '../generation-settings'
import type {FeedConnection} from '../schema'

const CONNECTION: FeedConnection = {
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'Yuna',
}
const storage = {getItem: vi.fn(() => null), setItem: vi.fn()}

it('should resolve the latest connection voice after loading automatic settings', async () => {
  const list = vi.fn(() => [CONNECTION])
  const loadAutomaticSettings = vi.fn(async () => ({
    modelId: 'full' as const,
    version: 1 as const,
    voiceId: 'M1' as const,
  }))

  const settings = await resolveGenerationSettings({
    connectionId: CONNECTION.id,
    connectionRepository: {list, save: vi.fn()},
    loadAutomaticSettings,
    storage,
  })

  expect(settings).toEqual({modelId: 'full', voiceId: 'Yuna'})
})

it('should use the automatic voice for a connection with the default voice', async () => {
  const settings = await resolveGenerationSettings({
    connectionId: CONNECTION.id,
    connectionRepository: {
      list: vi.fn(() => [{...CONNECTION, voiceId: 'default' as const}]),
      save: vi.fn(),
    },
    loadAutomaticSettings: vi.fn(async () => ({
      modelId: 'int8' as const,
      version: 1 as const,
      voiceId: 'M1' as const,
    })),
    storage,
  })

  expect(settings).toEqual({modelId: 'int8', voiceId: 'M1'})
})

it('should return null when the connection was removed while settings loaded', async () => {
  const settings = await resolveGenerationSettings({
    connectionId: CONNECTION.id,
    connectionRepository: {list: vi.fn(() => []), save: vi.fn()},
    loadAutomaticSettings: vi.fn(async () => ({
      modelId: 'int8' as const,
      version: 1 as const,
      voiceId: 'M1' as const,
    })),
    storage,
  })

  expect(settings).toBeNull()
})
