/** @vitest-environment node */

import {describe, expect, it, vi} from 'vitest'

import {
  createDelayedEndEventSettingsRepository,
  DEFAULT_DELAYED_END_EVENT_SETTINGS,
  type DelayedEndEventSettings,
  parseDelayedEndEventSettings,
} from '../delayed-end-event-settings'

const SETTINGS = {durationMinutes: 45, version: 1} as const

describe('delayed end event settings', () => {
  it('should accept only whole minute settings in the supported range', () => {
    expect(parseDelayedEndEventSettings(SETTINGS)).toEqual(SETTINGS)
    expect(parseDelayedEndEventSettings({durationMinutes: 0, version: 1})).toBeNull()
    expect(parseDelayedEndEventSettings({durationMinutes: 1.5, version: 1})).toBeNull()
    expect(parseDelayedEndEventSettings({durationMinutes: 121, version: 1})).toBeNull()
  })

  it('should read and write browser settings when no native bridge is present', async () => {
    let storedSettings: DelayedEndEventSettings = DEFAULT_DELAYED_END_EVENT_SETTINGS
    const writeWeb = vi.fn((settings: DelayedEndEventSettings) => {
      storedSettings = settings
      return null
    })
    const repository = createDelayedEndEventSettingsRepository({
      isNative: () => false,
      readToss: vi.fn(async () => null),
      readWeb: () => storedSettings,
      writeToss: vi.fn(async () => undefined),
      writeWeb,
    })

    await expect(repository.read()).resolves.toEqual(DEFAULT_DELAYED_END_EVENT_SETTINGS)
    await repository.write(SETTINGS)

    expect(writeWeb).toHaveBeenCalledWith(SETTINGS)
    await expect(repository.read()).resolves.toEqual(SETTINGS)
  })

  it('should restore native settings and repair browser storage', async () => {
    const writeWeb = vi.fn(() => null)
    const readToss = vi.fn(async () => SETTINGS)
    const repository = createDelayedEndEventSettingsRepository({
      isNative: () => true,
      readToss,
      readWeb: () => null,
      writeToss: vi.fn(async () => undefined),
      writeWeb,
    })

    await expect(repository.read()).resolves.toEqual(SETTINGS)

    expect(readToss).toHaveBeenCalledOnce()
    expect(writeWeb).toHaveBeenCalledWith(SETTINGS)
  })

  it('should keep a newer browser save while a native read is pending', async () => {
    const latestSettings = {durationMinutes: 60, version: 1} as const
    const nativeRead = Promise.withResolvers<DelayedEndEventSettings | null>()
    let webSettings: DelayedEndEventSettings | null = null
    const repository = createDelayedEndEventSettingsRepository({
      isNative: () => true,
      readToss: vi.fn(() => nativeRead.promise),
      readWeb: () => webSettings,
      writeToss: vi.fn(async () => undefined),
      writeWeb: vi.fn((settings: DelayedEndEventSettings) => {
        webSettings = settings
        return null
      }),
    })

    const pendingRead = repository.read()
    await repository.write(latestSettings)
    nativeRead.resolve(SETTINGS)

    await expect(pendingRead).resolves.toEqual(latestSettings)
    expect(webSettings).toEqual(latestSettings)
  })
})
