/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type DelayedEndEventController, useDelayedEndEvent} from '../features/focus-room-dialogue/use-delayed-end-event'

const renderController = (isEnabled: () => boolean, onEvent: () => Promise<void> | void) => {
  const ref: {current?: DelayedEndEventController} = {}
  const view = render(() => {
    ref.current = useDelayedEndEvent({isEnabled, onEvent})
    return null
  })
  if (!ref.current) throw new Error('missing controller')
  return {controller: ref.current, view}
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('probe delayed end disabled while pending', () => {
  it('should fire after re-enable when a new timer completes', async () => {
    let resolveFirst: (() => void) | undefined
    const onEvent = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve
        }),
    )
    const [isEnabled, setIsEnabled] = createSignal(true)
    const {controller, view} = renderController(isEnabled, onEvent)

    controller.start(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onEvent).toHaveBeenCalledOnce()

    setIsEnabled(false)
    setIsEnabled(true)
    controller.start(1)
    await vi.advanceTimersByTimeAsync(60_000)

    resolveFirst?.()
    await Promise.resolve()

    expect(onEvent).toHaveBeenCalledTimes(2)
    view.unmount()
  })
})
