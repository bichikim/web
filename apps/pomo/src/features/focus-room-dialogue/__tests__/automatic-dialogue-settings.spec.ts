import {expect, it, vi} from 'vitest'

import {
  createAutomaticDialogueSettingsRepository,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from '../automatic-dialogue-settings'

const createStorage = (storedValue: string | null = null) => ({
  getItem: vi.fn(() => storedValue),
  setItem: vi.fn(),
})

it('should use the compatible automatic generation defaults when no setting exists', () => {
  const repository = createAutomaticDialogueSettingsRepository(createStorage())

  expect(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS.modelId).toBe('int8')
  expect(repository.load()).toEqual(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
})

it('should persist and restore the selected model and voice', () => {
  const storage = createStorage()
  const repository = createAutomaticDialogueSettingsRepository(storage)
  const settings = {modelId: 'int8', version: 1, voiceId: 'M2'} as const

  repository.save(settings)
  expect(storage.setItem).toHaveBeenCalledWith(
    'pomo:automatic-dialogue-settings:v1',
    JSON.stringify(settings),
  )

  const savedValue = storage.setItem.mock.calls[0]?.[1] ?? null
  expect(createAutomaticDialogueSettingsRepository(createStorage(savedValue)).load()).toEqual(
    settings,
  )
})

it('should reject unsupported stored settings', () => {
  const repository = createAutomaticDialogueSettingsRepository(
    createStorage('{"modelId":"unknown","version":1,"voiceId":"Yuna"}'),
  )

  expect(() => repository.load()).toThrow('저장된 자동 음성 생성 설정이 올바르지 않아요.')
})
