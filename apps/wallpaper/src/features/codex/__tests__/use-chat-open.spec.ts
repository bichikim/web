/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useChatOpen} from '../use-chat-open'

afterEach(cleanup)

it('should open one chat at a time and allow another deliberate action after completion', async () => {
  const pending = Promise.withResolvers<void>()
  const operation = vi.fn(() => pending.promise)
  const {result} = renderHook(() => useChatOpen({open: () => operation, sessionId: () => 'chat'}))
  const first = result.open()
  await result.open()
  expect(operation).toHaveBeenCalledExactlyOnceWith('chat')
  expect(result.busy()).toBe(true)
  pending.resolve()
  await first
  await result.open()
  expect(operation).toHaveBeenCalledTimes(2)
  expect(result.busy()).toBe(false)
})

it('should ignore an unavailable opener and ignore failures after disposal', async () => {
  const absent = renderHook(() => useChatOpen({open: () => undefined, sessionId: () => 'chat'}))
  await absent.result.open()
  expect(absent.result.busy()).toBe(false)
  const pending = Promise.withResolvers<void>()
  const mounted = renderHook(() =>
    useChatOpen({open: () => () => pending.promise, sessionId: () => 'chat'}),
  )
  const operation = mounted.result.open()
  mounted.cleanup()
  pending.reject(new Error('unavailable'))
  await operation
  expect(mounted.result.error()).toBeNull()
})
