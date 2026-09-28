/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {
  createAutomaticDialogueSettingsRepository,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from '../features/focus-room-dialogue/automatic-dialogue-settings'

it('should load legacy automatic dialogue settings that omit the version field', () => {
  const stored = {modelId: 'int8', voiceId: 'M2'}
  const repository = createAutomaticDialogueSettingsRepository({
    getItem: () => JSON.stringify(stored),
    setItem: vi.fn(),
  })

  expect(repository.load()).toEqual({
    modelId: 'int8',
    version: 1,
    voiceId: 'M2',
  })
  expect(repository.load()).not.toEqual(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
})
