/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {usePEventController} from '../use-p-event-controller'

const playback = vi.hoisted(() => ({
  cancel: vi.fn(),
  dispose: vi.fn(),
  playSequence: vi.fn(async () => undefined),
  prepare: vi.fn(),
}))
vi.mock('../entry-playback-controller', () => ({createEntryPlaybackController: () => playback}))

const repositoryMocks = vi.hoisted(() => ({
  listEventBindings: vi.fn(async (): Promise<unknown[]> => []),
  setEventBinding: vi.fn(async () => undefined),
}))
vi.mock('../repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: repositoryMocks.listEventBindings,
    setEventBinding: repositoryMocks.setEventBinding,
  }),
}))

const delayedEndEventSettingsMocks = vi.hoisted(() => ({
  read: vi.fn(async () => ({durationMinutes: 1, version: 1 as const})),
  write: vi.fn(async () => undefined),
}))
vi.mock('../delayed-end-event-settings', async () => {
  const actual = await vi.importActual<typeof import('../delayed-end-event-settings')>(
    '../delayed-end-event-settings',
  )

  return {
    ...actual,
    readDelayedEndEventSettings: delayedEndEventSettingsMocks.read,
    writeDelayedEndEventSettings: delayedEndEventSettingsMocks.write,
  }
})

beforeEach(() => {
  vi.useFakeTimers()
  repositoryMocks.listEventBindings.mockReset().mockResolvedValue([
    {
      actionIds: ['music-stop'],
      dialogueIds: ['delayed-end-dialogue'],
      event: 'delayed-end',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  delayedEndEventSettingsMocks.read.mockReset().mockResolvedValue({
    durationMinutes: 1,
    version: 1,
  })
  playback.cancel.mockReset()
  playback.dispose.mockReset()
  playback.playSequence.mockReset().mockResolvedValue(undefined)
  playback.prepare.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should settle active playback before the next timer starts another delayed-end event', async () => {
  const view = renderHook(() =>
    usePEventController({isDelayedEndEventEnabled: true, isPlaybackEnabled: true}),
  )
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))
  view.result.registerEventActionExecutor?.(vi.fn())

  const activePlayback = Promise.withResolvers<undefined>()
  playback.playSequence.mockImplementationOnce(() => activePlayback.promise)
  playback.cancel.mockImplementationOnce(() => {
    activePlayback.resolve(undefined)
  })

  view.result.startDelayedEndEvent()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(playback.playSequence).toHaveBeenCalledOnce()
  expect(view.result.delayedEndEventIsRunning()).toBe(false)

  // The settings button starts a new timer after the previous timer expires.
  view.result.startDelayedEndEvent()
  expect(playback.cancel).toHaveBeenCalledOnce()
  expect(view.result.delayedEndEventIsRunning()).toBe(true)

  await vi.advanceTimersByTimeAsync(0)
  expect(playback.playSequence).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(playback.playSequence).toHaveBeenCalledTimes(2)

  view.cleanup()
})
