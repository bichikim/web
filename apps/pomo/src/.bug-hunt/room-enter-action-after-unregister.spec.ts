/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

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
  read: vi.fn(async () => ({durationMinutes: 30, version: 1 as const})),
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

/**
 * Bug: room-enter bound action is silently dropped when the event-action executor
 * was previously registered and then unregistered before enterFocusRoom() fires.
 *
 * Delayed-end actions queue correctly in the same gap (see use-p-event-controller.route.spec.tsx).
 */
it('should queue a room-enter action after its executor was temporarily unregistered', async () => {
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      actionIds: ['music-stop'],
      dialogueIds: ['entry-dialogue'],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])

  const view = renderHook(() => usePEventController({}))
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  const noop = vi.fn()
  const unregister = view.result.registerEventActionExecutor?.(noop)
  unregister?.()

  view.result.enterFocusRoom()

  const runAction = vi.fn()
  view.result.registerEventActionExecutor?.(runAction)

  expect(runAction).toHaveBeenCalledExactlyOnceWith('music-stop')
  view.cleanup()
})
