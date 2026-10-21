/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {CodexActivity} from '../types'
import {useCodexTitles} from '../use-codex-titles'

const activity: CodexActivity = {
  notificationId: 1,
  phase: 'working',
  receivedAt: 1,
  sessionId: 'chat',
  text: '작업 중',
  tool: null,
}
it('should read names once per notification and reject a stale title result', async () => {
  const first = Promise.withResolvers<string | null>()
  const latest = Promise.withResolvers<string | null>()
  const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise)
  const [activities, setActivities] = createSignal([activity])
  const {result, cleanup} = renderHook(() => useCodexTitles({activities, read}))
  setActivities([{...activity, tool: 'read_file'}])
  expect(read).toHaveBeenCalledOnce()
  setActivities([{...activity, notificationId: 2}])
  latest.resolve('새 제목')
  await Promise.resolve()
  first.resolve('오래된 제목')
  await Promise.resolve()
  expect(result().get('chat')).toBe('새 제목')
  cleanup()
})
it('should discard names for removed chats and ignore results after disposal', async () => {
  const pending = Promise.withResolvers<string | null>()
  const read = vi.fn().mockResolvedValueOnce('제목').mockReturnValueOnce(pending.promise)
  const [activities, setActivities] = createSignal([activity])
  const {result, cleanup} = renderHook(() => useCodexTitles({activities, read}))
  await Promise.resolve()
  expect(result().get('chat')).toBe('제목')
  setActivities([])
  expect(result().size).toBe(0)
  setActivities([{...activity, notificationId: 2}])
  cleanup()
  pending.resolve('이후 제목')
  await Promise.resolve()
  expect(result().size).toBe(0)
})
