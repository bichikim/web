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
  afterEach(() => {
    dispose()
    vi.unstubAllGlobals()
  })

  it('should restore each file selection through history and override it for an explicit address', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 8)
    await viewer.go(document('editor.tsx').location)
    viewer.selectLines(5, 9)
    await viewer.move(-1)
    expect(viewer.selection()).toMatchObject({endLine: 8, line: 3, path: 'main.tsx'})
    await viewer.move(1)
    expect(viewer.selection()).toMatchObject({endLine: 9, line: 5, path: 'editor.tsx'})
    await viewer.go(document('main.tsx').location, {restoreView: false})
    expect(viewer.selection()).toMatchObject({endLine: 1, line: 1, path: 'main.tsx'})
  })

  it('should restore exact text columns after leaving the file', async () => {
    const port = createPort()
    const source = {
      ...initial.document,
      lines: [[{kind: 'plain' as const, navigation: null, offset: 0, text: 'hello world'}]],
    }
    port.start = async (receive) => {
      receive({...initial, document: source})
      return () => {}
    }
    const viewer = mount(port)
    viewer.selectText({column: 3, endColumn: 7, endLine: 1, line: 1})
    await viewer.go(document('editor.tsx').location)
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {document: source}})
    await viewer.move(-1)
    expect(viewer.address()).toBe('main.tsx:1:3-1:7')
  })

  it('should clamp a restored range when the revisited file becomes shorter', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(8, 12)
    await viewer.go(document('editor.tsx').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {document: {...document('main.tsx'), lines: [[], []]}},
    })
    await viewer.move(-1)
    expect(viewer.selection()).toMatchObject({endLine: 2, line: 2})
  })

  it('should synchronize accepted file navigation and history without resetting selection', async () => {
    const port = createPort()
    port.location = vi.fn(async () => {})
    const viewer = mount(port)
    await viewer.go({column: 1, line: 3, path: 'next.ts'})
    viewer.selectLines(3, 5)
    expect(port.location).toHaveBeenLastCalledWith({path: 'next.ts', workspace: '/project'})
    expect(viewer.selection()).toMatchObject({endLine: 5, line: 3})
    expect(viewer.canBack()).toBe(true)
    await viewer.move(-1)
    expect(port.location).toHaveBeenLastCalledWith({path: 'main.tsx', workspace: '/project'})
    expect(viewer.canForward()).toBe(true)
    await viewer.refresh()
    expect(port.location).toHaveBeenCalledTimes(3)
  })

  it('should not synchronize failed or superseded file reads', async () => {
    const port = createPort()
    port.location = vi.fn(async () => {})
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(result('latest.ts'))
    const viewer = mount(port)
    const earlier = viewer.go({column: 1, line: 1, path: 'earlier.ts'})
    await viewer.go({column: 1, line: 1, path: 'latest.ts'})
    pending.resolve(result('earlier.ts'))
    await earlier
    vi.mocked(port.call).mockRejectedValueOnce(new Error('not found'))
    await viewer.go({column: 1, line: 1, path: 'missing.ts'})
    expect(vi.mocked(port.location).mock.calls).toEqual([
      [{path: 'main.tsx', workspace: '/project'}],
      [{path: 'latest.ts', workspace: '/project'}],
    ])
  })

  it('should copy an absolute tree path and preserve the viewed file and selection', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 5)
    const previous = viewer.session()?.document
    await viewer.copyPath('/project/src/my file.ts')
    expect(writeText).toHaveBeenCalledWith('/project/src/my file.ts')
    expect(viewer.notice()?.message).toBe('경로를 복사했습니다.')
    expect(viewer.session()?.document).toBe(previous)
    expect(viewer.selection()).toMatchObject({endLine: 5, line: 3})
    expect(port.call).not.toHaveBeenCalled()
    expect(port.context).not.toHaveBeenCalled()
    await viewer.copy('code text')
    expect(writeText).toHaveBeenLastCalledWith('code text')
    expect(viewer.notice()?.message).toBe('코드를 복사했습니다.')
  })

  it('should report a rejected path copy without announcing success', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {writeText: vi.fn().mockRejectedValue(new Error('clipboard denied'))},
    })
    const viewer = mount(createPort())
    await viewer.copyPath('/project/src')
    expect(viewer.notice()?.message).toBe('clipboard denied')
  })

  it('should add a tree path without changing the viewed document, line selection or history', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 5)
    const previous = viewer.session()?.document
    await viewer.sharePath({kind: 'directory', path: '/project/src'})
    expect(port.context).toHaveBeenCalledWith({kind: 'directory', path: '/project/src'})
    expect(viewer.session()?.document).toBe(previous)
    expect(viewer.selection()).toMatchObject({endLine: 5, line: 3})
    expect(port.call).not.toHaveBeenCalled()
    expect(viewer.canBack()).toBe(false)
    expect(viewer.notice()?.message).toBe('폴더를 다음 채팅 메시지에 추가했습니다.')
  })

  it('should report a rejected tree attachment without announcing success', async () => {
    const port = createPort()
    vi.mocked(port.context).mockRejectedValue(new Error('context failed'))
    const viewer = mount(port)
    await viewer.sharePath({kind: 'file', path: '/project/main.tsx'})
    expect(viewer.notice()?.message).toBe('context failed')
  })

  it('should reject a tree attachment from a previous workspace', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.sharePath({kind: 'file', path: '/other/file.ts'})
    expect(port.context).not.toHaveBeenCalled()
  })

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

  it('should attach SVG as a file by default and retain an explicit source selection', async () => {
    const port = createPort()
    port.start = async (receive) => {
      receive({
        ...initial,
        document: {
          ...document('icon.svg'),
          media: {kind: 'image', mimeType: 'image/svg+xml', size: 10},
        },
      })
      return () => {}
    }
    const viewer = mount(port)
    await viewer.share()
    expect(port.context).toHaveBeenLastCalledWith({kind: 'file', path: '/project/icon.svg'})
    await viewer.share({column: 2, endColumn: 5, endLine: 1, line: 1, path: 'icon.svg'})
    expect(port.context).toHaveBeenLastCalledWith({
      column: 2,
      endColumn: 5,
      endLine: 1,
      line: 1,
      path: '/project/icon.svg',
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
  it('should retain the latest notice and dismiss without restoring older feedback', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.reportError(new Error('earlier failure'))
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    expect(viewer.notice()?.message).toBe(
      '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.',
    )
    viewer.reportError(new Error('latest failure'))
    expect(viewer.notice()?.message).toBe('latest failure')
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
  })
  it('should expose ambiguous definitions and preserve choices when dismissing their notice', async () => {
    const port = createPort()
    const viewer = mount(port)
    const locations = [document('first.ts').location, document('second.ts').location]
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Report'})
    expect(viewer.notice()?.message).toBe('이동할 정의를 선택하세요.')
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
    expect(viewer.choices()).toEqual(locations)
    await viewer.go(locations[0])
    expect(viewer.choices()).toEqual([])
    expect(viewer.session()?.document.location.path).toBe('first.ts')
  })
})
