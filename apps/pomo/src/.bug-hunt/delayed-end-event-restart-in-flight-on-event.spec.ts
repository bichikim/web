/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type DelayedEndEventController,
  useDelayedEndEvent,
} from '../features/focus-room-dialogue/use-delayed-end-event'

const renderDelayedEndEvent = (onEvent: () => void | Promise<void>) => {
  const controllerReference: {current?: DelayedEndEventController} = {}
  const view = render(() => {
    controllerReference.current = useDelayedEndEvent({isEnabled: () => true, onEvent})
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

describe('useDelayedEndEvent restart while onEvent is in flight', () => {
  it('should not invoke onEvent again after restart while the first timer callback is still awaiting', async () => {
    let releaseFirst: () => void = () => undefined
    const firstEvent = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const onEvent = vi
      .fn<() => void | Promise<void>>()
      .mockImplementationOnce(() => firstEvent)
      .mockResolvedValueOnce(undefined)
    const {controller, view} = renderDelayedEndEvent(onEvent)

    controller.start(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onEvent).toHaveBeenCalledOnce()

    controller.start(2)
    await vi.advanceTimersByTimeAsync(120_000)

    releaseFirst()
    await Promise.resolve()

    expect(onEvent).toHaveBeenCalledOnce()

    view.unmount()
  })
})
