import {expect, it, vi} from 'vitest'
import {createHostContext} from '../create-host-context'
import {createPendingTasks} from '../create-pending-tasks'
import {formatContext} from '../format-context'
import {MAX_CONTEXT_BYTES} from '../../shared/context-limits'

const snippet = {
  column: 1,
  endLine: 1,
  kind: 'code',
  line: 1,
  path: '/project/main.ts',
  text: 'unsaved snapshot',
} as const

it('should append a memo as text context without reading a file or sending a message', async () => {
  const update = vi.fn().mockResolvedValue({})
  const call = vi.fn()
  const host = createHostContext({
    app: {updateModelContext: update},
    call,
    current: () => undefined,
    requests: createPendingTasks(),
    standard: false,
  })
  await host.context(snippet)
  await host.addTextContext('오류 문구 정리')
  expect(update).toHaveBeenLastCalledWith({
    content: [
      {text: formatContext(snippet), type: 'text'},
      {text: '오류 문구 정리', type: 'text'},
    ],
  })
  expect(call).not.toHaveBeenCalled()
})

it('should retain accepted attachments on failure and serialize removal with later additions', async () => {
  const update = vi.fn().mockResolvedValue({})
  const call = vi.fn()
  const host = createHostContext({
    app: {updateModelContext: update},
    call,
    current: () => undefined,
    requests: createPendingTasks(),
    standard: true,
  })
  const receive = vi.fn()
  host.subscribeContext(receive)
  await host.context(snippet)
  update.mockRejectedValueOnce(new Error('host rejected'))
  await expect(host.removeContext()).rejects.toThrow('host rejected')
  expect(receive).toHaveBeenLastCalledWith([expect.stringContaining('unsaved snapshot')])
  await Promise.all([host.removeContext(0), host.context({...snippet, text: 'next draft'})])
  expect(update).toHaveBeenLastCalledWith({
    content: [{text: expect.stringContaining('next draft'), type: 'text'}],
  })
  expect(receive.mock.calls.at(-1)?.[0]).toHaveLength(1)
  expect(call).not.toHaveBeenCalled()
})

it('should reject oversized snapshots without changing host context', async () => {
  const update = vi.fn().mockResolvedValue({})
  const host = createHostContext({
    app: {updateModelContext: update},
    call: vi.fn(),
    current: () => undefined,
    requests: createPendingTasks(),
    standard: true,
  })
  await expect(host.context({...snippet, text: '가'.repeat(30_000)})).rejects.toThrow('64 KiB')
  expect(update).not.toHaveBeenCalled()
})

it('should reserve native export separators before accepting another snapshot', async () => {
  const overhead = formatContext({...snippet, text: ''}).length
  const first = {...snippet, text: 'x'.repeat(MAX_CONTEXT_BYTES - overhead * 2 - 1)}
  const stage = vi.fn().mockResolvedValue(undefined)
  const host = createHostContext({
    app: {updateModelContext: vi.fn().mockResolvedValue({})},
    call: vi.fn(),
    current: () => undefined,
    requests: createPendingTasks(),
    stage,
    standard: true,
  })
  await host.context(first)
  // 한 줄 구분자로는 정확히 한도에 들어오지만 파일 구분자는 더 깁니다.
  await expect(host.context({...snippet, text: ''})).rejects.toThrow('64 KiB')
  expect(stage).toHaveBeenLastCalledWith([formatContext(first)])
})

it('should reject a failed file read without attaching a path-only substitute', async () => {
  const update = vi.fn().mockResolvedValue({})
  const call = vi
    .fn()
    .mockResolvedValue({content: [], isError: true, structuredContent: {code: 'outside-workspace'}})
  const host = createHostContext({
    app: {updateModelContext: update},
    call,
    current: () => undefined,
    requests: createPendingTasks(),
    standard: true,
  })
  await expect(host.context({kind: 'file', path: '/outside/main.ts'})).rejects.toThrow(
    '작업 폴더 밖',
  )
  expect(update).not.toHaveBeenCalled()
})

it('should retain staged snapshots on host API rejection and subsequent staging failure', async () => {
  const stage = vi.fn().mockResolvedValue(undefined)
  const update = vi.fn().mockRejectedValue(new Error('unsupported context'))
  const host = createHostContext({
    app: {updateModelContext: update},
    call: vi.fn(),
    current: () => undefined,
    requests: createPendingTasks(),
    stage,
    standard: true,
  })
  const receive = vi.fn()
  host.subscribeContext(receive)
  await host.context(snippet)
  expect(stage).toHaveBeenCalledWith([expect.stringContaining('unsaved snapshot')])
  expect(receive).toHaveBeenLastCalledWith([expect.stringContaining('unsaved snapshot')])
  stage.mockRejectedValueOnce(new Error('session expired'))
  await expect(host.removeContext()).rejects.toThrow('session expired')
  expect(receive).toHaveBeenLastCalledWith([expect.stringContaining('unsaved snapshot')])
  expect(update).toHaveBeenCalledOnce()
})
