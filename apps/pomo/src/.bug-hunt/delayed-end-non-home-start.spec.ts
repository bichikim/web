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
}))
const delayedEndEventSettingsMocks = vi.hoisted(() => ({
  read: vi.fn(async () => ({durationMinutes: 1, version: 1 as const})),
  write: vi.fn(async () => undefined),
}))
vi.mock('../features/focus-room-dialogue/repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: repositoryMocks.listEventBindings,
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

describe('bug-hunt: delayed-end on non-home routes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    playback.playSequence.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start the delayed-end timer when playback is disabled on desktop settings routes', async () => {
    const view = renderHook(() => usePEventController({isPlaybackEnabled: false}))
    await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

    view.result.startDelayedEndEvent?.()

    expect(view.result.delayedEndEventIsRunning?.()).toBe(true)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(playback.playSequence).toHaveBeenCalled()

    view.cleanup()
  })
})
