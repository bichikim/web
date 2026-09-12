import {expect, it, vi} from 'vitest'
import {createInactivityController} from '../create-inactivity-controller'

it('should reset the deadline, defer while blocked, and cancel on disposal', () => {
  let expire = () => {}
  let blocked = false
  const cancel = vi.fn()
  const schedule = vi.fn((callback: () => void, _milliseconds: number) => {
    expire = callback
    return cancel
  })
  const onHiddenChange = vi.fn()
  const controller = createInactivityController({
    enabled: () => true,
    isSuspended: () => false,
    isBlocked: () => blocked,
    seconds: () => 15,
    onHiddenChange,
    schedule,
  })
  controller.wake()
  expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 15_000)
  expect(onHiddenChange).toHaveBeenLastCalledWith(false)
  blocked = true
  expire()
  expect(onHiddenChange).toHaveBeenLastCalledWith(false)
  expect(schedule).toHaveBeenCalledTimes(2)
  blocked = false
  expire()
  expect(onHiddenChange).toHaveBeenLastCalledWith(true)
  controller.wake()
  expect(onHiddenChange).toHaveBeenLastCalledWith(false)
  controller.dispose()
  expect(cancel).toHaveBeenCalledTimes(3)
})

it.each([
  {enabled: false, suspended: false},
  {enabled: true, suspended: true},
])('should remain visible without a deadline for %o', ({enabled, suspended}) => {
  const schedule = vi.fn()
  const onHiddenChange = vi.fn()
  const controller = createInactivityController({
    enabled: () => enabled,
    isSuspended: () => suspended,
    isBlocked: () => false,
    seconds: () => 30,
    onHiddenChange,
    schedule,
  })
  controller.wake()
  expect(onHiddenChange).toHaveBeenCalledWith(false)
  expect(schedule).not.toHaveBeenCalled()
})
