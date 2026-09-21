/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../features/focus-room-dialogue/event-context'
import {
  usePEventController,
  type UsePEventControllerProps,
} from '../features/focus-room-dialogue/use-p-event-controller'

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
vi.mock('../features/focus-room-dialogue/repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: repositoryMocks.listEventBindings,
  }),
}))

const delayedEndEventSettingsMocks = vi.hoisted(() => ({
  read: vi.fn(async () => ({durationMinutes: 1, version: 1 as const})),
  write: vi.fn(async () => undefined),
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

interface EventControllerHarnessProps extends UsePEventControllerProps {
  readonly onController: (controller: PEventContextValue) => void
}

const EventControllerHarness = (props: EventControllerHarnessProps): JSX.Element => {
  props.onController(usePEventController(props))
  return null
}

describe('cancelDelayedEndEvent in-flight catch-up gap', () => {
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
    playback.cancel.mockClear()
    playback.dispose.mockClear()
    playback.playSequence.mockReset().mockResolvedValue(undefined)
    playback.prepare.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should cancel in-flight catch-up dialogue when user cancels the delayed-end timer', async () => {
    let controller: PEventContextValue | undefined
    let setPlayback: ((enabled: boolean) => void) | undefined
    let resolveCatchUp: (() => void) | undefined
    const view = render(() => {
      const [isPlaybackEnabled, setIsPlaybackEnabled] = createSignal(true)
      setPlayback = setIsPlaybackEnabled

      return (
        <EventControllerHarness
          isDelayedEndEventEnabled={true}
          isPlaybackEnabled={isPlaybackEnabled()}
          onController={(nextController) => {
            controller = nextController
          }}
        />
      )
    })

    await vi.waitFor(() => expect(controller?.isLoading()).toBe(false))
    const capturedController = controller

    if (capturedController === undefined) {
      throw new Error('Expected the event controller to be captured.')
    }

    capturedController.startDelayedEndEvent()
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledOnce())
    await vi.advanceTimersByTimeAsync(60_000)

    playback.playSequence.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          resolveCatchUp = () => resolve(undefined)
        }),
    )

    capturedController.registerEventActionExecutor?.(vi.fn())
    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledOnce())

    capturedController.cancelDelayedEndEvent()
    expect(playback.cancel).toHaveBeenCalledTimes(2)

    resolveCatchUp?.()
    await Promise.resolve()

    view.unmount()
  })
})
