/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {usePEventController} from '../features/focus-room-dialogue/use-p-event-controller'

const playback = vi.hoisted(() => ({
  cancel: vi.fn(),
  dispose: vi.fn(),
  playSequence: vi.fn(async () => undefined),
  prepare: vi.fn(),
}))
vi.mock('../features/focus-room-dialogue/entry-playback-controller', () => ({
  createEntryPlaybackController: () => playback,
}))
const repositoryMocks = vi.hoisted(() => ({
  listEventBindings: vi.fn(async (): Promise<unknown[]> => []),
  setEventBinding: vi.fn(async () => undefined),
}))
const delayedEndEventSettingsMocks = vi.hoisted(() => ({
  read: vi.fn(async () => ({durationMinutes: 30, version: 1 as const})),
  write: vi.fn(async () => undefined),
}))
vi.mock('../features/focus-room-dialogue/repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: repositoryMocks.listEventBindings,
    setEventBinding: repositoryMocks.setEventBinding,
  }),
}))
vi.mock('../features/focus-room-dialogue/delayed-end-event-settings', async () => {
  const actual = await vi.importActual<
    typeof import('../features/focus-room-dialogue/delayed-end-event-settings')
  >('../features/focus-room-dialogue/delayed-end-event-settings')

  return {
    ...actual,
    readDelayedEndEventSettings: delayedEndEventSettingsMocks.read,
    writeDelayedEndEventSettings: delayedEndEventSettingsMocks.write,
  }
})

describe('delayed end duration while running', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    playback.playSequence.mockReset().mockResolvedValue(undefined)
    repositoryMocks.listEventBindings.mockReset().mockResolvedValue([
      {
        dialogueIds: ['delayed-end-dialogue'],
        event: 'delayed-end',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ])
    delayedEndEventSettingsMocks.write.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should restart the active timer when a shorter duration is saved mid-run', async () => {
    const view = renderHook(() => usePEventController({isDelayedEndEventEnabled: true}))
    await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

    view.result.startDelayedEndEvent?.()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    await view.result.setDelayedEndEventDuration?.(5)
    await vi.advanceTimersByTimeAsync(5 * 60_000)

    expect(playback.playSequence).toHaveBeenCalledOnce()
    view.cleanup()
  })
})
