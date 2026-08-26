import {expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => 'client'),
  createRepository: vi.fn(() => ({load: vi.fn(async () => 'settings')})),
  generateAudio: vi.fn(async () => 'audio'),
  isDownloaded: vi.fn(async () => true),
}))

vi.mock('../../supertonic/client', () => ({createSupertonicClient: mocks.createClient}))
vi.mock('../../supertonic/download', () => ({isSupertonicModelDownloaded: mocks.isDownloaded}))
vi.mock('../../focus-room-dialogue/generate-dialogue-audio', () => ({
  generateCompressedDialogueAudio: mocks.generateAudio,
}))
vi.mock('../../focus-room-dialogue/automatic-dialogue-settings', () => ({
  createAutomaticDialogueSettingsRepository: mocks.createRepository,
}))

import type {AutomaticDialogueSettingsStorage} from '../../focus-room-dialogue/automatic-dialogue-settings-contract'
import type {GenerateDialogueAudioOptions} from '../../focus-room-dialogue/generate-dialogue-audio'
import {feedGenerationRuntime} from '../generation-runtime'

it('should lazily delegate every feed-generation dependency', async () => {
  const storage = {} as AutomaticDialogueSettingsStorage
  const audioOptions = {} as GenerateDialogueAudioOptions

  await expect(feedGenerationRuntime.createVoiceClient()).resolves.toBe('client')
  await expect(feedGenerationRuntime.generateDialogueAudio(audioOptions)).resolves.toBe('audio')
  await expect(feedGenerationRuntime.loadAutomaticDialogueSettings(storage)).resolves.toBe(
    'settings',
  )
  await expect(feedGenerationRuntime.isModelDownloaded('full')).resolves.toBe(true)

  expect(mocks.generateAudio).toHaveBeenCalledWith(audioOptions)
  expect(mocks.createRepository).toHaveBeenCalledWith(storage)
  expect(mocks.isDownloaded).toHaveBeenCalledWith({modelId: 'full'})
  expect(feedGenerationRuntime.settingsChangedEvent).toBeTruthy()
})
