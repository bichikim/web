import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {CodeDocument, ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {useViewer} from '../use-viewer'

const document = (path: string): CodeDocument => ({
  lines: Array.from({length: 12}, () => []),
  location: {column: 1, line: 1, path},
  revision: path,
  source: path,
})
const initial: ViewerSession = {
  document: document('main.tsx'),
  session: 'session',
  workspace: '/project',
}
const result = (path: string): CallToolResult => ({
  content: [],
  structuredContent: {document: document(path)},
})
const createPort = (): ViewerPort => ({
  call: vi.fn(async (_name, input) => result(String(input.path))),
  context: vi.fn(async () => {}),
  start: async (receive) => {
    receive(initial)
    return () => {}
  },
})

describe('useViewer', () => {
  let dispose: () => void
  const mount = (port: ViewerPort) =>
    createRoot((cleanup) => {
      dispose = cleanup
      return useViewer(port)
    })
  afterEach(() => dispose())

  it('should preserve the rendered document when focus refresh returns unchanged code', async () => {
    const viewer = mount(createPort())
    const previous = viewer.session()?.document
    await viewer.refresh()
    expect(viewer.session()?.document).toBe(previous)
    expect(viewer.address()).toBe('main.tsx:1:1')
  })

  it('should select a line locally and add its address to chat without navigating', async () => {
    const port = createPort()
    const viewer = mount(port)
    const previous = viewer.session()?.document
    viewer.selectLines(8)
    expect(viewer.selection()).toEqual({column: 1, endLine: 8, line: 8, path: 'main.tsx'})
    expect(viewer.session()?.document).toBe(previous)
    expect(port.call).not.toHaveBeenCalled()
    expect(viewer.canBack()).toBe(false)
    await viewer.share()
    expect(port.context).toHaveBeenCalledWith({
      column: 1,
      endLine: 8,
      line: 8,
      path: '/project/main.tsx',
    })
  })

  it('should retain exact columns and attach a menu snapshot after the current selection changes', async () => {
    const port = createPort()
    const file: CodeDocument = {
      ...initial.document,
      lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'hello world'}]],
      source: 'hello world',
    }
    port.start = async (receive) => {
      receive({...initial, document: file})
      return () => {}
    }
    const viewer = mount(port)
    viewer.selectText({column: 3, endColumn: 7, endLine: 1, line: 1})
    expect(viewer.address()).toBe('main.tsx:1:3-1:7')
    const snapshot = viewer.selection()!
    viewer.selectLines(1)
    await viewer.share(snapshot)
    expect(port.context).toHaveBeenCalledWith({
      column: 3,
      endColumn: 7,
      endLine: 1,
      line: 1,
      path: '/project/main.tsx',
    })
  })

  it('should normalize an upward selection and add the entire range to chat', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(9, 3)
    expect(viewer.selection()).toMatchObject({endLine: 9, line: 3})
    await viewer.share()
    expect(port.context).toHaveBeenCalledWith({
      column: 1,
      endLine: 9,
      line: 3,
      path: '/project/main.tsx',
    })
  })

  it('should preserve the latest selection when a pending refresh finishes', async () => {
    const port = createPort()
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    const viewer = mount(port)
    viewer.selectLines(2, 4)
    const refresh = viewer.refresh()
    viewer.selectLines(5, 8)
    pending.resolve(result('main.tsx'))
    await refresh
    expect(viewer.selection()).toMatchObject({endLine: 8, line: 5})
    expect(viewer.address()).toBe('main.tsx:5:1-8:1')
  })

  it('should reset the selection on file navigation and retain it on failure', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 8)
    await viewer.go(document('editor.tsx').location)
    expect(viewer.selection()).toEqual({column: 1, endLine: 1, line: 1, path: 'editor.tsx'})
    viewer.selectLines(4, 6)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {error: {code: 'not-found'}},
    })
    await viewer.go(document('missing.ts').location)
    expect(viewer.selection()).toMatchObject({endLine: 6, line: 4, path: 'editor.tsx'})
  })

  it('should clamp the range after a refreshed file becomes shorter', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(8, 12)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {
        document: {...document('main.tsx'), lines: [[], [], []], revision: 'updated'},
      },
    })
    await viewer.refresh()
    expect(viewer.selection()).toMatchObject({endLine: 3, line: 3})
    expect(viewer.address()).toBe('main.tsx:3:1')
  })

  it('should preserve back and forward history after a failed navigation', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('editor.tsx').location)
    await viewer.move(-1)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {error: {code: 'not-found'}},
    })
    await viewer.go(document('missing.ts').location)
    expect(viewer.session()?.document.location.path).toBe('main.tsx')
    expect(viewer.canForward()).toBe(true)
    await viewer.move(1)
    expect(viewer.session()?.document.location.path).toBe('editor.tsx')
  })

  it('should let a symbol click supersede a pending focus refresh', async () => {
    const port = createPort()
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({
        content: [],
        structuredContent: {locations: [document('editor.tsx').location]},
      })
      .mockResolvedValueOnce(result('editor.tsx'))
    const viewer = mount(port)
    const refresh = viewer.refresh()
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Editor'})
    pending.resolve(result('main.tsx'))
    await refresh
    expect(viewer.session()?.document.location.path).toBe('editor.tsx')
    expect(viewer.canBack()).toBe(true)
  })

  it('should keep the latest file search when an earlier request finishes later', async () => {
    const port = createPort()
    const earlier = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call)
      .mockReturnValueOnce(earlier.promise)
      .mockResolvedValueOnce({content: [], structuredContent: {paths: ['editor.tsx']}})
    const viewer = mount(port)
    const first = viewer.find('main')
    await viewer.find('editor')
    earlier.resolve({content: [], structuredContent: {paths: ['main.tsx']}})
    await first
    expect(viewer.files()).toEqual(['editor.tsx'])
    expect(viewer.search()).toBe('editor')
  })

  it('should report a missing file separately from the selected address and dismiss the notice', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(4, 6)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.go(document('missing.tsx').location)
    expect(viewer.notice()?.message).toBe('파일을 찾을 수 없습니다.')
    expect(viewer.address()).toBe('main.tsx:4:1-6:1')
    await viewer.refresh()
    expect(viewer.notice()?.message).toBe('파일을 찾을 수 없습니다.')
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
    expect(viewer.address()).toBe('main.tsx:4:1-6:1')
  })

  it('should show chat context confirmation without replacing the selected address', async () => {
    const viewer = mount(createPort())
    viewer.selectLines(3, 5)
    await viewer.share()
    expect(viewer.notice()?.message).toBe(
      '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.',
    )
    expect(viewer.address()).toBe('main.tsx:3:1-5:1')
    viewer.selectLines(8)
    expect(viewer.address()).toBe('main.tsx:8:1')
    expect(viewer.notice()?.message).toBe(
      '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.',
    )
  })

  it('should show unavailable definition feedback separately from the file address', async () => {
    const port = createPort()
    const viewer = mount(port)
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    expect(viewer.notice()?.message).toBe(
      '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.',
    )
    expect(viewer.address()).toBe('main.tsx:1:1')
  })
})
