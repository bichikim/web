/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {usePEventController} from '../use-p-event-controller'
import {MAX_LATEST_REPLACEMENT_DIALOGUE_IDS} from '../dialogue-playback-policy'
// oxlint-disable-next-line import/default -- Vite exposes raw imports as default strings.
import source from '../use-p-event-controller.ts?raw'

it('should load with the development localization output', () => {
  expect(usePEventController).toBeTypeOf('function')
})

it('should import messages from the output-structure-independent entrypoint', () => {
  expect(source).toContain("from '@paraglide/message'")
  expect(source).not.toMatch(/from '@paraglide\/message\//u)
})

const playback = vi.hoisted(() => ({
  cancel: vi.fn(),
  dispose: vi.fn(),
  playSequence: vi.fn(async () => undefined),
  prepare: vi.fn(),
}))
vi.mock('../entry-playback-controller', () => ({createEntryPlaybackController: () => playback}))
const repositoryMocks = vi.hoisted(() => ({
  listEventBindings: vi.fn(async (): Promise<unknown[]> => []),
}))
const delayedEndEventSettingsMocks = vi.hoisted(() => ({
  read: vi.fn(async () => ({durationMinutes: 30, version: 1 as const})),
  write: vi.fn(async () => undefined),
}))
vi.mock('../repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: repositoryMocks.listEventBindings,
  }),
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

it.each([true, false])('should propagate playback completion %s', async (completed) => {
  playback.prepare.mockResolvedValueOnce(completed)
  const view = renderHook(() => usePEventController({}))
  await expect(view.result.playDialogue('memo')).resolves.toBe(completed)
  view.cleanup()
})

it('should return false when playback is disabled', async () => {
  const view = renderHook(() => usePEventController({isPlaybackEnabled: false}))
  await expect(view.result.playDialogue('memo')).resolves.toBe(false)
  view.cleanup()
})

it('should start a delayed-end timer while playback is suspended', async () => {
  const view = renderHook(() =>
    usePEventController({isDelayedEndEventEnabled: true, isPlaybackEnabled: false}),
  )
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))
  vi.useFakeTimers()

  try {
    view.result.startDelayedEndEvent()

    expect(view.result.delayedEndEventIsRunning()).toBe(true)
  } finally {
    view.cleanup()
    vi.useRealTimers()
  }
})

it('should cap only catch-up event dialogue playback', async () => {
  const dialogueIds = Array.from({length: 40}, (_, index) => `dialogue-${index}`)
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      dialogueIds,
      event: 'focus-start',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  playback.playSequence.mockClear()

  const view = renderHook(() => usePEventController({}))
  await view.result.playDialogueEvents(['focus-start'])
  expect(playback.playSequence).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({dialogueIds}),
  )

  await view.result.playDialogueEvents(['focus-start'], undefined, {
    replacementPolicy: 'latest',
  })
  expect(playback.playSequence).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      dialogueIds: dialogueIds.slice(-MAX_LATEST_REPLACEMENT_DIALOGUE_IDS),
      replacementPolicy: 'latest',
    }),
  )
  view.cleanup()
})

it('should run actions together with the dialogues connected to an event', async () => {
  const runAction = vi.fn()
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      actionIds: ['music-stop'],
      dialogueIds: [],
      event: 'delayed-end',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])

  const view = renderHook(() => usePEventController({}))
  const unregister = view.result.registerEventActionExecutor?.(runAction)

  await view.result.playDialogueEvents(['delayed-end'])

  expect(runAction).toHaveBeenCalledExactlyOnceWith('music-stop')
  unregister?.()
  view.cleanup()
})

it('should retain an entry action until event bindings finish loading', async () => {
  const eventBindings = Promise.withResolvers<unknown[]>()
  repositoryMocks.listEventBindings.mockImplementationOnce(() => eventBindings.promise)

  const view = renderHook(() => usePEventController({}))
  view.result.enterFocusRoom()
  eventBindings.resolve([
    {
      actionIds: ['music-start'],
      dialogueIds: [],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  const runAction = vi.fn()
  const unregister = view.result.registerEventActionExecutor?.(runAction)

  expect(runAction).toHaveBeenCalledExactlyOnceWith('music-start')
  unregister?.()
  view.cleanup()
})

it('should not replay a non-entry action that happened before executor registration', async () => {
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      actionIds: ['music-stop'],
      dialogueIds: [],
      event: 'focus-start',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])

  const view = renderHook(() => usePEventController({}))
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  await view.result.playDialogueEvents(['focus-start'])

  const executor = vi.fn()
  view.result.registerEventActionExecutor?.(executor)

  expect(executor).not.toHaveBeenCalled()
  view.cleanup()
})

it('should not replay an event action after its executor has been unregistered', async () => {
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      actionIds: ['music-start'],
      dialogueIds: [],
      event: 'focus-start',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])

  const view = renderHook(() => usePEventController({}))
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  const firstExecutor = vi.fn()
  const unregister = view.result.registerEventActionExecutor?.(firstExecutor)
  unregister?.()

  await view.result.playDialogueEvents(['focus-start'])

  const nextExecutor = vi.fn()
  view.result.registerEventActionExecutor?.(nextExecutor)

  expect(firstExecutor).not.toHaveBeenCalled()
  expect(nextExecutor).not.toHaveBeenCalled()
  view.cleanup()
})

it('should keep the last persisted duration after overlapping saves fail', async () => {
  const pendingSave = Promise.withResolvers<undefined>()
  delayedEndEventSettingsMocks.write.mockReturnValue(pendingSave.promise)

  const view = renderHook(() => usePEventController({}))
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  const firstSave = view.result.setDelayedEndEventDuration?.(40)
  const secondSave = view.result.setDelayedEndEventDuration?.(50)
  await vi.waitFor(() => expect(delayedEndEventSettingsMocks.write).toHaveBeenCalledTimes(2))

  const failure = new Error('native settings unavailable')
  pendingSave.reject(failure)

  await expect(firstSave).rejects.toBe(failure)
  await expect(secondSave).rejects.toBe(failure)
  expect(view.result.delayedEndEventDurationMinutes?.()).toBe(30)
  view.cleanup()
})
