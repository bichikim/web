import {expect, it, vi} from 'vitest'
import {createHostAttachments} from '../create-host-attachments'

const setup = () => {
  const call = vi.fn().mockResolvedValue({content: []})
  const clear = vi.fn().mockResolvedValue(undefined)
  const host = createHostAttachments({
    call,
    clear,
    composer: true,
    session: () => 'current',
    standard: true,
  })
  return {call, clear, host}
}

it('should attach only a selected file without reading or clearing unrelated pending context', async () => {
  const {call, clear, host} = setup()
  await host.attachSelection?.({kind: 'file', path: '/project/original.ts'})
  expect(call).toHaveBeenCalledExactlyOnceWith('code.attach-to-composer', {
    attachment: {kind: 'file', path: '/project/original.ts'},
    session: 'current',
  })
  expect(clear).not.toHaveBeenCalled()
})

it('should export only the selected unsaved editor text without reading disk content', async () => {
  const {call, clear, host} = setup()
  await host.attachSelection?.({
    column: 1,
    endLine: 1,
    kind: 'code',
    line: 1,
    path: '/project/main.ts',
    text: 'unsaved only',
  })
  expect(call).toHaveBeenCalledExactlyOnceWith('code.attach-to-composer', {
    attachment: {
      filename: 'main.ts.selection.txt',
      kind: 'text',
      text: expect.stringContaining('unsaved only'),
    },
    session: 'current',
  })
  expect(clear).not.toHaveBeenCalled()
})

it('should serialize selected file pastes and recover after a failed paste', async () => {
  const {call, host} = setup()
  const first = Promise.withResolvers<{content: never[]}>()
  const started = Promise.withResolvers<void>()
  call.mockImplementationOnce(() => {
    started.resolve()
    return first.promise
  })
  const failed = host.attachSelection!({kind: 'file', path: '/project/first.ts'})
  const second = host.attachSelection!({kind: 'file', path: '/project/second.ts'})
  await started.promise
  expect(call).toHaveBeenCalledOnce()
  const rejected = expect(failed).rejects.toThrow('paste failed')
  first.reject(new Error('paste failed'))
  await rejected
  await second
  expect(call).toHaveBeenLastCalledWith('code.attach-to-composer', {
    attachment: {kind: 'file', path: '/project/second.ts'},
    session: 'current',
  })
})

it('should name an unsaved patch for its original file and exclude unrelated context', async () => {
  const {call, clear, host} = setup()
  await host.attachSelection?.({
    kind: 'changes',
    patch: '@@ -1 +1 @@\n-before\n+after',
    path: '/project/main.ts',
    revision: 'saved-version',
  })
  expect(call).toHaveBeenCalledExactlyOnceWith('code.attach-to-composer', {
    attachment: {
      filename: 'main.ts.changes.patch',
      kind: 'text',
      text: expect.stringContaining('@@ -1 +1 @@\n-before\n+after'),
    },
    session: 'current',
  })
  expect(clear).not.toHaveBeenCalled()
})

it('should name a source line range for its original file', async () => {
  const {call, clear, host} = setup()
  call.mockResolvedValueOnce({content: [{text: 'only selected line', type: 'text'}]})
  await host.attachSelection?.({column: 1, endLine: 2, line: 2, path: '/project/main.ts'})
  expect(call).toHaveBeenLastCalledWith('code.attach-to-composer', {
    attachment: {
      filename: 'main.ts.selection.txt',
      kind: 'text',
      text: expect.stringContaining('only selected line'),
    },
    session: 'current',
  })
  expect(clear).not.toHaveBeenCalled()
})
