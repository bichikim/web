import {expect, it, vi} from 'vitest'
import {createInactivityController} from '..'

it('should reset the deadline, defer while blocked, and cancel on disposal', () => {
  let expire = () => {}
  let blocked = false
  const cancel = vi.fn()
  const schedule = vi.fn((callback: () => void, _milliseconds: number) => {
    expire = callback
    return cancel
  })
  const onInactiveChange = vi.fn()
  const controller = createInactivityController({
    enabled: () => true,
    isBlocked: () => blocked,
    isSuspended: () => false,
    onInactiveChange,
    schedule,
    timeoutMs: () => 15_000,
  })
  controller.reset()
  expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 15_000)
  expect(onInactiveChange).toHaveBeenLastCalledWith(false)
  blocked = true
  expire()
  expect(onInactiveChange).toHaveBeenLastCalledWith(false)
  expect(schedule).toHaveBeenCalledTimes(2)
  blocked = false
  expire()
  expect(onInactiveChange).toHaveBeenLastCalledWith(true)
  controller.reset()
  expect(onInactiveChange).toHaveBeenLastCalledWith(false)
  controller.dispose()
  expect(cancel).toHaveBeenCalledTimes(3)
})

it.each([
  {enabled: false, suspended: false},
  {enabled: true, suspended: true},
])('should remain visible without a deadline for %o', ({enabled, suspended}) => {
  const schedule = vi.fn()
  const onInactiveChange = vi.fn()
  const controller = createInactivityController({
    enabled: () => enabled,
    isBlocked: () => false,
    isSuspended: () => suspended,
    onInactiveChange,
    schedule,
    timeoutMs: () => 30_000,
  })
  controller.reset()
  expect(onInactiveChange).toHaveBeenCalledWith(false)
  expect(schedule).not.toHaveBeenCalled()
})

it('should make disposal idempotent and ignore subsequent resets', () => {
  const cancel = vi.fn()
  const schedule = vi.fn(() => cancel)
  const onInactiveChange = vi.fn()
  const controller = createInactivityController({
    enabled: () => true,
    isBlocked: () => false,
    isSuspended: () => false,
    onInactiveChange,
    schedule,
    timeoutMs: () => 1000,
  })
  controller.reset()
  controller.dispose()
  controller.dispose()
  controller.reset()
  controller.wake()
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(schedule).toHaveBeenCalledTimes(1)
  expect(onInactiveChange).toHaveBeenCalledTimes(1)
})
