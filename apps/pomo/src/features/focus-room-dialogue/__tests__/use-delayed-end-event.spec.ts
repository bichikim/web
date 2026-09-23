/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
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
