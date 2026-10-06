/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type DelayedEndEventController, useDelayedEndEvent} from '../use-delayed-end-event'

const renderDelayedEndEvent = (isEnabled: () => boolean, onEvent: () => void) => {
  const controllerReference: {current?: DelayedEndEventController} = {}
  const view = render(() => {
    controllerReference.current = useDelayedEndEvent({isEnabled, onEvent})
    return null
  })

  if (controllerReference.current === undefined) {
    throw new Error('Expected a delayed end event controller')
  }

  return {controller: controllerReference.current, view}
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDelayedEndEvent', () => {
  it('should trigger the event once after the configured number of minutes', async () => {
    const onEvent = vi.fn()
    const {controller, view} = renderDelayedEndEvent(() => true, onEvent)

    controller.start(2)
    expect(controller.isRunning()).toBe(true)

    await vi.advanceTimersByTimeAsync(2 * 60_000 - 1)
    expect(onEvent).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onEvent).toHaveBeenCalledOnce()
    expect(controller.isRunning()).toBe(false)
    view.unmount()
  })

  it('should cancel an earlier timer when restarted or cancelled', async () => {
    const onEvent = vi.fn()
    const {controller, view} = renderDelayedEndEvent(() => true, onEvent)

    controller.start(2)
    await vi.advanceTimersByTimeAsync(60_000)
    controller.start(1)
    await vi.advanceTimersByTimeAsync(60_000 - 1)
    expect(onEvent).not.toHaveBeenCalled()
    controller.cancel()
    expect(controller.isRunning()).toBe(false)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onEvent).not.toHaveBeenCalled()
    view.unmount()
  })

  it('should queue a restarted timer until an earlier event settles after re-enabling', async () => {
    let resolveEvent: (() => void) | undefined
    const onEvent = vi.fn().mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveEvent = resolve
        }),
    )
    const [isEnabled, setIsEnabled] = createSignal(true)
    const {controller, view} = renderDelayedEndEvent(isEnabled, onEvent)

    controller.start(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onEvent).toHaveBeenCalledOnce()

    setIsEnabled(false)
    await vi.advanceTimersByTimeAsync(0)
    setIsEnabled(true)
    controller.start(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onEvent).toHaveBeenCalledOnce()

    resolveEvent?.()
    await vi.advanceTimersByTimeAsync(0)
    expect(onEvent).toHaveBeenCalledTimes(2)
    view.unmount()
  })

  it('should ignore starts outside the enabled playback scope or duration range', async () => {
    const onEvent = vi.fn()
    const {controller, view} = renderDelayedEndEvent(() => false, onEvent)

    controller.start(1)
    controller.start(0)
    controller.start(121)
    await vi.advanceTimersByTimeAsync(2 * 60_000)

    expect(onEvent).not.toHaveBeenCalled()
    expect(controller.isRunning()).toBe(false)
    view.unmount()
  })

  it('should cancel a pending timer when the owner is unmounted', async () => {
    const onEvent = vi.fn()
    const {controller, view} = renderDelayedEndEvent(() => true, onEvent)

    controller.start(1)
    view.unmount()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(onEvent).not.toHaveBeenCalled()
  })
})
