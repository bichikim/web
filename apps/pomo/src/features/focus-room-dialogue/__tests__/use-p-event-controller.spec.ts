/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

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
  setEventBinding: vi.fn(async () => undefined),
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
    setEventBinding: repositoryMocks.setEventBinding,
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

it('should replay an action that happened before executor registration', async () => {
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

  const pendingPlayback = view.result.playDialogueEvents(['focus-start'])

  const executor = vi.fn()
  view.result.registerEventActionExecutor?.(executor)
  await pendingPlayback

  expect(executor).toHaveBeenCalledExactlyOnceWith('music-stop')
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

it('should retain an entry action after its executor has been unregistered', async () => {
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      actionIds: ['music-stop'],
      dialogueIds: [],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])

  const view = renderHook(() => usePEventController({}))
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  const initialExecutor = vi.fn()
  const unregister = view.result.registerEventActionExecutor?.(initialExecutor)
  unregister?.()

  view.result.enterFocusRoom()

  const nextExecutor = vi.fn()
  view.result.registerEventActionExecutor?.(nextExecutor)

  expect(initialExecutor).not.toHaveBeenCalled()
  expect(nextExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')
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

it('should keep the newest persisted duration after overlapping saves complete out of order', async () => {
  const firstSave = Promise.withResolvers<undefined>()
  const secondSave = Promise.withResolvers<undefined>()
  const thirdSave = Promise.withResolvers<undefined>()
  delayedEndEventSettingsMocks.write
    .mockReset()
    .mockReturnValueOnce(firstSave.promise)
    .mockReturnValueOnce(secondSave.promise)
    .mockReturnValueOnce(thirdSave.promise)

  const view = renderHook(() => usePEventController({}))
  await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))

  const firstSaveRequest = view.result.setDelayedEndEventDuration?.(40)
  const secondSaveRequest = view.result.setDelayedEndEventDuration?.(50)
  await vi.waitFor(() => expect(delayedEndEventSettingsMocks.write).toHaveBeenCalledTimes(2))

  secondSave.resolve(undefined)
  await secondSaveRequest
  firstSave.resolve(undefined)
  await firstSaveRequest

  const thirdSaveRequest = view.result.setDelayedEndEventDuration?.(60)
  await vi.waitFor(() => expect(delayedEndEventSettingsMocks.write).toHaveBeenCalledTimes(3))

  const failure = new Error('native settings unavailable')
  thirdSave.reject(failure)

  await expect(thirdSaveRequest).rejects.toBe(failure)
  expect(view.result.delayedEndEventDurationMinutes?.()).toBe(50)
  view.cleanup()
})

describe('delayed-end playback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    repositoryMocks.listEventBindings.mockReset().mockResolvedValue([
      {
        dialogueIds: ['delayed-end-dialogue'],
        event: 'delayed-end',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ])
    delayedEndEventSettingsMocks.write.mockReset().mockResolvedValue(undefined)
    playback.playSequence.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should stop registered external speech before playback starts', async () => {
    const playbackOrder: string[] = []
    const stopExternalSpeech = vi.fn(() => playbackOrder.push('stop'))
    playback.playSequence.mockImplementationOnce(async () => {
      playbackOrder.push('play')
    })

    const view = renderHook(() => usePEventController({}))
    await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))
    await view.result.setDelayedEndEventDuration?.(1)
    const unregister = view.result.registerBeforePlayback?.(stopExternalSpeech)

    view.result.startDelayedEndEvent?.()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(stopExternalSpeech).toHaveBeenCalledOnce()
    expect(playbackOrder).toEqual(['stop', 'play'])
    unregister?.()
    view.cleanup()
  })
})

describe('event binding persistence', () => {
  beforeEach(() => {
    repositoryMocks.listEventBindings.mockReset().mockResolvedValue([])
    repositoryMocks.setEventBinding.mockReset().mockResolvedValue(undefined)
  })

  it('should preserve unrelated bindings and remove empty dialogue, action, and mode entries', async () => {
    const view = renderHook(() => usePEventController({}))
    await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))
    try {
      await view.result.setEventDialogues('focus-end', ['unrelated'])
      await view.result.setEventItems('focus-start', [
        {id: 'first', type: 'dialogue'},
        {id: 'music-stop', type: 'action'},
      ])
      expect(view.result.eventDialogueIds()['focus-start']).toEqual(['first'])
      expect(view.result.eventActionIds()['focus-start']).toEqual(['music-stop'])
      expect(Object.hasOwn(view.result.eventPlaybackModes(), 'focus-start')).toBe(true)
      await view.result.setEventItems('focus-start', [{id: 'music-stop', type: 'action'}])
      expect(Object.hasOwn(view.result.eventDialogueIds(), 'focus-start')).toBe(false)
      expect(Object.hasOwn(view.result.eventPlaybackModes(), 'focus-start')).toBe(false)
      expect(view.result.eventActionIds()['focus-start']).toEqual(['music-stop'])
      await view.result.setEventItems('focus-start', [])
      expect(Object.hasOwn(view.result.eventActionIds(), 'focus-start')).toBe(false)
      expect(view.result.eventDialogueIds()['focus-end']).toEqual(['unrelated'])
      expect(repositoryMocks.setEventBinding).toHaveBeenLastCalledWith(
        'focus-start',
        [],
        expect.any(String),
      )
    } finally {
      view.cleanup()
    }
  })

  it('should restore every persisted binding entry after deletion fails', async () => {
    const view = renderHook(() => usePEventController({}))
    await vi.waitFor(() => expect(view.result.isLoading()).toBe(false))
    try {
      await view.result.setEventItems('focus-start', [
        {id: 'first', type: 'dialogue'},
        {id: 'music-stop', type: 'action'},
      ])
      const modes = view.result.eventPlaybackModes()
      const failure = new Error('binding storage unavailable')
      repositoryMocks.setEventBinding.mockRejectedValueOnce(failure)
      await expect(view.result.setEventItems('focus-start', [])).rejects.toBe(failure)
      expect(view.result.eventDialogueIds()['focus-start']).toEqual(['first'])
      expect(view.result.eventActionIds()['focus-start']).toEqual(['music-stop'])
      expect(view.result.eventPlaybackModes()).toEqual(modes)
    } finally {
      view.cleanup()
    }
  })
})
