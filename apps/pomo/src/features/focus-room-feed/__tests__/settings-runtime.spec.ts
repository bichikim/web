/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createAutomaticDialogueSettingsRepository} from '../../focus-room-dialogue/automatic-dialogue-settings'
import {createFeedSettingsRuntime} from '../settings-runtime'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

it('should resolve connection and automatic settings from the same isolated storage', async () => {
  const storage = createStorage()
  const runtime = createFeedSettingsRuntime(storage)
  const separate = createFeedSettingsRuntime(createStorage())
  createAutomaticDialogueSettingsRepository(storage).save({
    modelId: 'int8',
    version: 1,
    voiceId: 'Yuna',
  })
  runtime.createConnections().save([
    {
      createdAt: '2026-08-14T00:00:00.000Z',
      id: 'feed-1',
      updatedAt: '2026-08-14T00:00:00.000Z',
      url: 'https://example.com/feed.xml',
      version: 1,
      voiceId: 'default',
    },
  ])
  await expect(runtime.resolveGeneration('feed-1')).resolves.toEqual({
    modelId: 'int8',
    voiceId: 'Yuna',
  })
  await expect(separate.resolveGeneration('feed-1')).resolves.toBeNull()
  expect(separate.listConnections()).toEqual([])
  runtime.createConnections().save([])
  await expect(runtime.resolveGeneration('feed-1')).resolves.toBeNull()
})

it('should use the current shared preference instead of an older persisted value', async () => {
  const storage = createStorage()
  const runtime = createFeedSettingsRuntime(storage)
  createAutomaticDialogueSettingsRepository(storage).save({
    modelId: 'full',
    version: 1,
    voiceId: 'Yuna',
  })
  runtime.createConnections().save([
    {
      createdAt: '2026-08-14T00:00:00.000Z',
      id: 'feed-1',
      updatedAt: '2026-08-14T00:00:00.000Z',
      url: 'https://example.com/feed.xml',
      version: 1,
      voiceId: 'default',
    },
  ])
  await expect(
    runtime.resolveGeneration('feed-1', {modelId: 'int8', version: 1, voiceId: 'Yuna'}),
  ).resolves.toEqual({modelId: 'int8', voiceId: 'Yuna'})
})
