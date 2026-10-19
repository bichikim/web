/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  createTextGenerationSettingsRepository,
  DEFAULT_TEXT_GENERATION_SETTINGS,
  parseTextGenerationSettings,
  TEXT_GENERATION_SETTINGS_KEY,
} from '../settings'

const storage = {getItem: vi.fn(), setItem: vi.fn()}
afterEach(() => vi.clearAllMocks())

describe('text generation settings', () => {
  it('should preserve Gemma as the default and persist the selected LFM model', async () => {
    storage.getItem.mockReturnValue(null)
    const repository = createTextGenerationSettingsRepository(storage)
    await expect(repository.read()).resolves.toEqual(DEFAULT_TEXT_GENERATION_SETTINGS)
    const settings = {modelId: 'lfm-2.6b-qad', version: 1} as const
    await repository.write(settings)
    expect(storage.setItem).toHaveBeenCalledWith(
      TEXT_GENERATION_SETTINGS_KEY,
      JSON.stringify(settings),
    )
    storage.getItem.mockReturnValue(JSON.stringify(settings))
    await expect(repository.read()).resolves.toEqual(settings)
  })

  it('should accept local and cloud defaults and the supported version', () => {
    expect(parseTextGenerationSettings({modelId: 'cloud', version: 1})).toEqual({
      modelId: 'cloud',
      version: 1,
    })
    expect(parseTextGenerationSettings({modelId: 'lfm-2.6b-qad', version: 1})).toEqual({
      modelId: 'lfm-2.6b-qad',
      version: 1,
    })
    expect(parseTextGenerationSettings({modelId: 'gemma-4-e2b', version: 1})).toEqual(
      DEFAULT_TEXT_GENERATION_SETTINGS,
    )
    expect(parseTextGenerationSettings({modelId: 'qwen-2b', version: 1})).toBeNull()
    expect(parseTextGenerationSettings({modelId: 'lfm-2.6b-qad', version: 2})).toBeNull()
    expect(parseTextGenerationSettings(null)).toBeNull()
  })

  it('should report a failed write instead of reporting a saved preference', async () => {
    storage.getItem.mockReturnValue(null)
    storage.setItem.mockImplementationOnce(() => {
      throw new Error('Quota exceeded')
    })
    await expect(
      createTextGenerationSettingsRepository(storage).write(DEFAULT_TEXT_GENERATION_SETTINGS),
    ).rejects.toThrow('Failed to persist text generation settings.')
  })
})
