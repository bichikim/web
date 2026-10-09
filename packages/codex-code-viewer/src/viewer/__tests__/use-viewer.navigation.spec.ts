import {afterEach, describe, expect, it, vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import {createPort, createViewerFixture, document, initial, result} from './fixtures/viewer'

describe('useViewer navigation', () => {
  const {mount, dispose} = createViewerFixture()
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

  it('should return to a cursor address after clearing a text range', () => {
    const viewer = mount(createPort())
    viewer.editing.change('hello world')
    viewer.selectText({column: 1, endColumn: 7, endLine: 1, line: 1})
    expect(viewer.address()).toBe('main.tsx:1:1-1:7')
    viewer.selectText({column: 7, endColumn: 7, endLine: 1, line: 1})
    expect(viewer.address()).toBe('main.tsx:1:7')
    viewer.selectText({column: 1, endColumn: 1, endLine: 1, line: 1})
    expect(viewer.address()).toBe('main.tsx:1:1')
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

  it('should preserve the rendered document when focus refresh returns unchanged code', async () => {
    const viewer = mount(createPort())
    const previous = viewer.session()?.document
    await viewer.refresh()
    expect(viewer.session()?.document).toBe(previous)
    expect(viewer.address()).toBe('main.tsx:1:1')
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

  it('should follow a draft definition to lines that do not exist on disk yet', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('helper.ts').location)
    viewer.editing.change('\n\nexport const helper = 1\n')
    await viewer.go(document('main.tsx').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {locations: [{column: 14, line: 3, path: 'helper.ts'}]},
    })
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'helper'})
    expect(viewer.session()?.document.location).toEqual({column: 14, line: 3, path: 'helper.ts'})
    expect(viewer.editing.source()).toBe('\n\nexport const helper = 1\n')
    expect(port.call).toHaveBeenCalledWith(
      'code.navigate',
      expect.objectContaining({
        sources: [{path: 'helper.ts', source: '\n\nexport const helper = 1\n'}],
      }),
    )
  })
})
