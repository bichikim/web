/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDelayedEndEvent} from '../features/focus-room-dialogue/use-delayed-end-event'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should not run a queued delayed-end event after cancel settles the in-flight handler', async () => {
  let resolveFirst: () => void = () => undefined
  const onEvent = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve
        }),
    )
    .mockImplementation(() => undefined)

  let controller: ReturnType<typeof useDelayedEndEvent> | undefined
  const view = render(() => {
    controller = useDelayedEndEvent({isEnabled: () => true, onEvent})
    return null
  })

  controller!.start(1)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()

  controller!.start(1)
  await vi.advanceTimersByTimeAsync(60_000)

  controller!.cancel()

  resolveFirst()
  await vi.advanceTimersByTimeAsync(0)

  expect(onEvent).toHaveBeenCalledOnce()

  view.unmount()
})
