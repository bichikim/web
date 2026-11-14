import {expect, it, vi} from 'vitest'
import {createHostMemos} from '../create-host-memos'
import {createPendingTasks} from '../create-pending-tasks'
import {INITIAL_MEMOS} from '../../shared/memo-state'

it('should wait for connection, serialize writes and keep later writes running after a failure', async () => {
  const connected = Promise.withResolvers<void>()
  const blocked = Promise.withResolvers<{content: []; structuredContent: typeof INITIAL_MEMOS}>()
  const started = Promise.withResolvers<void>()
  const call = vi
    .fn()
    .mockImplementationOnce(() => {
      started.resolve()
      return blocked.promise
    })
    .mockResolvedValue({content: [], structuredContent: {...INITIAL_MEMOS, items: ['메모']}})
  const tasks = createPendingTasks()
  const memos = createHostMemos({call, ready: () => connected.promise, requests: tasks})
  const first = memos.saveMemos({visible: true})
  const second = memos.saveMemos({items: ['메모']})
  const failure = expect(first).rejects.toThrow('disk unavailable')
  expect(call).not.toHaveBeenCalled()
  connected.resolve()
  await started.promise
  expect(call).toHaveBeenCalledTimes(1)
  blocked.reject(new Error('disk unavailable'))
  await failure
  await second
  await tasks.settle()
  expect(call.mock.calls.map(([name, input]) => ({input, name}))).toEqual([
    {input: {patch: {visible: true}}, name: 'code.save-memos'},
    {input: {patch: {items: ['메모']}}, name: 'code.save-memos'},
  ])
  expect(await memos.readMemos()).toMatchObject({items: ['메모']})
})

it('should report memo save failures with memo wording and retain the retry queue', async () => {
  const call = vi
    .fn()
    .mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'memo-write-failed'},
    })
    .mockResolvedValue({content: [], structuredContent: {...INITIAL_MEMOS, items: ['메모']}})
  const memos = createHostMemos({
    call,
    ready: () => Promise.resolve(),
    requests: createPendingTasks(),
  })
  await expect(memos.saveMemos({items: ['메모']})).rejects.toThrow(
    '메모를 저장하지 못했습니다. 저장 권한과 남은 공간을 확인해 주세요.',
  )
  await expect(memos.saveMemos({items: ['메모']})).resolves.toMatchObject({items: ['메모']})
})
