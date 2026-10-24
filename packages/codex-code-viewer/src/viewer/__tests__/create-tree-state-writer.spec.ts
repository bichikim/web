import {expect, it, vi} from 'vitest'
import {createTreeStateWriter} from '../create-tree-state-writer'
import {createPendingTasks} from '../create-pending-tasks'

it('should report a failed write and still persist the next state in order', async () => {
  const call = vi
    .fn()
    .mockResolvedValueOnce({content: [], isError: true, structuredContent: {code: 'read-failed'}})
    .mockResolvedValueOnce({content: [], structuredContent: {visible: true}})
  const writer = createTreeStateWriter({call, requests: createPendingTasks()})
  const first = writer.save('one', {visible: false})
  const second = writer.save('one', {visible: true})
  await expect(first).rejects.toThrow()
  await second
  await writer.settle()
  expect(call.mock.calls.map(([, input]) => input)).toEqual([
    {patch: {visible: false}, session: 'one'},
    {patch: {visible: true}, session: 'one'},
  ])
})
