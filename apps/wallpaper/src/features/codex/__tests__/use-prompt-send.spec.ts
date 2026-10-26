/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {usePromptSend} from '../use-prompt-send'

afterEach(cleanup)

it('should hide immediately and keep waiting after acceptance without accepting duplicate sends', async () => {
  const delivery = Promise.withResolvers<void>()
  const send = vi.fn(() => delivery.promise)
  const {result} = renderHook(() => usePromptSend({send: () => send, sessionId: () => 'chat'}))
  result.edit('요청')
  const pending = result.send()
  expect(result.visible()).toBe(false)
  expect(result.busy()).toBe(true)
  result.edit('다른 요청')
  await result.send()
  expect(result.draft()).toBe('요청')
  delivery.resolve()
  await pending
  expect(result.busy()).toBe(false)
  expect(result.visible()).toBe(false)
  await result.send()
  expect(send).toHaveBeenCalledExactlyOnceWith('chat', '요청')
})

it('should restore the draft only on failure and allow an explicit retry', async () => {
  const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
  const {result} = renderHook(() => usePromptSend({send: () => send, sessionId: () => 'chat'}))
  result.edit('유지할 요청')
  await result.send()
  expect(result.visible()).toBe(true)
  expect(result.draft()).toBe('유지할 요청')
  expect(result.error()).toContain('전송하지 못했습니다.')
  expect(send).toHaveBeenCalledOnce()
  await result.send()
  expect(result.visible()).toBe(false)
  expect(result.error()).toBeNull()
  expect(send).toHaveBeenCalledTimes(2)
})

it('should keep waiting when activity metadata changes for the same response', async () => {
  const [activity, setActivity] = createSignal({notificationId: 1, sessionId: 'chat', title: ''})
  const send = vi.fn().mockResolvedValue(undefined)
  const {result} = renderHook(() =>
    usePromptSend({
      notificationId: () => activity().notificationId,
      send: () => send,
      sessionId: () => activity().sessionId,
    }),
  )
  result.edit('요청')
  await result.send()
  setActivity((previous) => ({...previous, title: '새 제목'}))
  expect(result.visible()).toBe(false)
})

it.each(['resolve', 'reject'] as const)(
  'should ignore an earlier delivery that will %s after a new response arrives',
  async (outcome) => {
    const [notification, setNotification] = createSignal(1)
    const delivery = Promise.withResolvers<void>()
    const send = vi.fn(() => delivery.promise)
    const {result} = renderHook(() =>
      usePromptSend({
        notificationId: notification,
        send: () => send,
        sessionId: () => 'chat',
      }),
    )
    result.edit('이전 요청')
    const pending = result.send()
    setNotification(2)
    expect(result.visible()).toBe(true)
    expect(result.draft()).toBe('')
    result.edit('새 요청')
    if (outcome === 'resolve') {
      delivery.resolve()
    } else {
      delivery.reject(new Error('stale failure'))
    }
    await pending
    expect(result.draft()).toBe('새 요청')
    expect(result.error()).toBeNull()
    expect(result.visible()).toBe(true)
  },
)

it('should reset a failed draft when the target chat changes', async () => {
  const [session, setSession] = createSignal('first')
  const send = vi.fn().mockRejectedValue(new Error('offline'))
  const {result} = renderHook(() => usePromptSend({send: () => send, sessionId: session}))
  result.edit('첫 채팅 요청')
  await result.send()
  setSession('second')
  expect(result.visible()).toBe(true)
  expect(result.draft()).toBe('')
  expect(result.error()).toBeNull()
})

it('should ignore a delivery failure after unmounting', async () => {
  const delivery = Promise.withResolvers<void>()
  const {result, cleanup: unmount} = renderHook(() =>
    usePromptSend({
      send: () => () => delivery.promise,
      sessionId: () => 'chat',
    }),
  )
  result.edit('요청')
  const pending = result.send()
  unmount()
  delivery.reject(new Error('offline'))
  await pending
  expect(result.error()).toBeNull()
})
