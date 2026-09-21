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

    const runAction = vi.fn()
    capturedController.registerEventActionExecutor?.(runAction)
    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledOnce())
    expect(runAction).toHaveBeenCalledExactlyOnceWith('music-stop')

    view.unmount()
  })

  it('should retry delayed-end catch-up after playback fails', async () => {
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

    capturedController.startDelayedEndEvent()
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledOnce())
    await vi.advanceTimersByTimeAsync(60_000)

    const playbackFailure = new Error('Playback failed')
    playback.playSequence.mockRejectedValueOnce(playbackFailure).mockResolvedValueOnce(undefined)
    capturedController.registerEventActionExecutor?.(vi.fn())
    setPlayback?.(true)

    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledOnce())
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledTimes(2))
    setPlayback?.(true)
    await vi.waitFor(() => expect(playback.playSequence).toHaveBeenCalledTimes(2))
    view.unmount()
  })

  it('should discard a pending delayed-end catch-up when restarting the timer', async () => {
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

    capturedController.startDelayedEndEvent()
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledOnce())
    await vi.advanceTimersByTimeAsync(60_000)

    expect(capturedController.delayedEndEventIsRunning()).toBe(false)
    expect(playback.playSequence).not.toHaveBeenCalled()

    capturedController.startDelayedEndEvent()
    expect(capturedController.delayedEndEventIsRunning()).toBe(true)

    capturedController.registerEventActionExecutor?.(vi.fn())
    setPlayback?.(true)
    await Promise.resolve()
    await Promise.resolve()
    expect(playback.playSequence).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(playback.playSequence).toHaveBeenCalledOnce()
    view.unmount()
  })

  it('should discard a pending delayed-end catch-up when cancelling after timer expiry', async () => {
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

    capturedController.startDelayedEndEvent()
    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledOnce())
    await vi.advanceTimersByTimeAsync(60_000)

    expect(capturedController.delayedEndEventIsRunning()).toBe(false)
    capturedController.cancelDelayedEndEvent()

    capturedController.registerEventActionExecutor?.(vi.fn())
    setPlayback?.(true)
    await Promise.resolve()
    await Promise.resolve()

    expect(playback.playSequence).not.toHaveBeenCalled()
    view.unmount()
  })

  it('should cancel an in-flight delayed-end catch-up when restarting the timer', async () => {
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

    playback.cancel.mockImplementationOnce(() => {
      resolveCatchUp?.()
    })
    capturedController.startDelayedEndEvent()
    expect(playback.cancel).toHaveBeenCalledTimes(2)
    expect(capturedController.delayedEndEventIsRunning()).toBe(true)

    await Promise.resolve()
    expect(playback.playSequence).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(playback.playSequence).toHaveBeenCalledTimes(2)
    view.unmount()
  })

  it('should discard delayed-end actions when catch-up is interrupted before executor registration', async () => {
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
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    setPlayback?.(false)
    await vi.waitFor(() => expect(playback.cancel).toHaveBeenCalledTimes(2))

    const runAction = vi.fn()
    capturedController.registerEventActionExecutor?.(runAction)

    expect(runAction).not.toHaveBeenCalled()
    expect(playback.playSequence).not.toHaveBeenCalled()
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

    capturedController.registerEventActionExecutor?.(vi.fn())
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

  it('should run a queued room-enter action before starting entry dialogue', async () => {
    repositoryMocks.listEventBindings.mockResolvedValueOnce([
      {
        actionIds: ['music-stop'],
        dialogueIds: ['entry-dialogue'],
        event: 'room-enter',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ])
    let controller: PEventContextValue | undefined
    const playbackOrder: string[] = []
    const view = render(() => (
      <EventControllerHarness
        isDelayedEndEventEnabled={true}
        isPlaybackEnabled={true}
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))

    await vi.waitFor(() => expect(controller?.isLoading()).toBe(false))
    const capturedController = controller

    if (capturedController === undefined) {
      throw new Error('Expected the event controller to be captured.')
    }

    playback.playSequence.mockImplementationOnce(async () => {
      playbackOrder.push('dialogue')
    })
    const runAction = vi.fn(() => {
      playbackOrder.push('action')
    })

    capturedController.enterFocusRoom()

    expect(playback.playSequence).not.toHaveBeenCalled()

    capturedController.registerEventActionExecutor?.(runAction)
    await vi.waitFor(() => expect(playbackOrder).toEqual(['action', 'dialogue']))

    view.unmount()
  })

  it('should wait for a delayed-end action before starting dialogue playback', async () => {
    let controller: PEventContextValue | undefined
    const playbackOrder: string[] = []
    const view = render(() => {
      return (
        <EventControllerHarness
          isDelayedEndEventEnabled={true}
          isPlaybackEnabled={true}
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

    playback.playSequence.mockImplementationOnce(async () => {
      playbackOrder.push('dialogue')
    })

    const initialRunAction = vi.fn()
    const unregisterInitialExecutor =
      capturedController.registerEventActionExecutor?.(initialRunAction)
    unregisterInitialExecutor?.()

    const playbackRequest = capturedController.playDialogueEvents(['delayed-end'])
    expect(playback.playSequence).not.toHaveBeenCalled()

    const runAction = vi.fn(() => {
      playbackOrder.push('action')
    })
    capturedController.registerEventActionExecutor?.(runAction)
    await playbackRequest

    expect(playbackOrder).toEqual(['action', 'dialogue'])

    view.unmount()
  })
})
