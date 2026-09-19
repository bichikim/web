/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../event-context'
import {usePEventController, type UsePEventControllerProps} from '../use-p-event-controller'

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
vi.mock('../repository', () => ({
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

interface EventControllerHarnessProps extends UsePEventControllerProps {
  readonly onController: (controller: PEventContextValue) => void
}

const EventControllerHarness = (props: EventControllerHarnessProps): JSX.Element => {
  props.onController(usePEventController(props))
  return null
}

describe('delayed-end route transitions', () => {
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
    delayedEndEventSettingsMocks.write.mockReset().mockResolvedValue(undefined)
    playback.cancel.mockClear()
    playback.dispose.mockClear()
    playback.playSequence.mockReset().mockResolvedValue(undefined)
    playback.prepare.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should catch up a delayed-end event after returning home', async () => {
    let controller: PEventContextValue | undefined
    let setPlayback: ((enabled: boolean) => void) | undefined
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

    const initialRunAction = vi.fn()
    const unregisterInitialExecutor =
      capturedController.registerEventActionExecutor?.(initialRunAction)
    capturedController.startDelayedEndEvent()
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledOnce())
    unregisterInitialExecutor?.()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(capturedController.delayedEndEventIsRunning()).toBe(false)
    expect(playback.playSequence).not.toHaveBeenCalled()
    expect(initialRunAction).not.toHaveBeenCalled()

    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledOnce())

    const runAction = vi.fn()
    capturedController.registerEventActionExecutor?.(runAction)
    expect(runAction).toHaveBeenCalledExactlyOnceWith('music-stop')

    view.unmount()
  })

  it('should discard delayed-end actions after catch-up completes without an executor', async () => {
    let controller: PEventContextValue | undefined
    let setPlayback: ((enabled: boolean) => void) | undefined
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

    const initialRunAction = vi.fn()
    const unregisterInitialExecutor =
      capturedController.registerEventActionExecutor?.(initialRunAction)
    capturedController.startDelayedEndEvent()
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledOnce())
    unregisterInitialExecutor?.()
    await vi.advanceTimersByTimeAsync(60_000)

    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledOnce())
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledTimes(2))

    setPlayback?.(true)
    const runAction = vi.fn()
    capturedController.registerEventActionExecutor?.(runAction)

    expect(runAction).not.toHaveBeenCalled()
    view.unmount()
  })

  it('should retry a delayed-end catch-up interrupted by another suspension', async () => {
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

    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledOnce())

    playback.cancel.mockImplementationOnce(() => {
      resolveCatchUp?.()
    })
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledTimes(2))

    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledTimes(2))

    view.unmount()
  })
})
