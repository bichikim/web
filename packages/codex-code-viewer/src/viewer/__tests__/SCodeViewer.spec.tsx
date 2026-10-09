/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {EditorView} from '@codemirror/view'
import {SCodeViewer} from '../SCodeViewer'
import type {ViewerPort} from '../types'

Object.defineProperty(Range.prototype, 'getClientRects', {
  configurable: true,
  value: () => [] as unknown as DOMRectList,
})

describe('SCodeViewer', () => {
  const mountEditor = () => {
    const source = 'hello selected world'
    const port: ViewerPort = {
      call: vi.fn().mockResolvedValue({content: []}),
      context: vi.fn(),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    render(() => <SCodeViewer port={port} />)
    vi.mocked(port.start).mock.calls[0]![0]({
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: source}]],
        location: {column: 1, line: 1, path: 'notes.txt'},
        revision: 'first',
        source,
      },
      session: 'session',
      workspace: '/project',
    })
    fireEvent.click(screen.getByRole('button', {name: '편집'}))
    const textbox = screen.getByRole('textbox', {name: '코드 편집기'})
    const editor = EditorView.findFromDOM(textbox)!
    return {editor, port, textbox}
  }
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    if (originalScroll === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
    }
  })

  it.each(['ctrlKey', 'metaKey'] as const)(
    'should search the editor selection with %s and retain the draft',
    (modifier) => {
      const {editor, textbox} = mountEditor()
      editor.dispatch({selection: {anchor: 6, head: 14}})
      fireEvent.keyDown(textbox, {key: 'f', [modifier]: true})
      expect(screen.getByRole('textbox', {name: '파일 내 검색어'})).toHaveValue('selected')
      expect(editor.state.sliceDoc()).toBe('hello selected world')
    },
  )

  it('should return focus to the editor after closing file search', () => {
    const {textbox} = mountEditor()
    fireEvent.keyDown(textbox, {ctrlKey: true, key: 'f'})
    fireEvent.keyDown(screen.getByRole('textbox', {name: '파일 내 검색어'}), {key: 'Escape'})
    expect(document.activeElement).toBe(textbox)
    expect(screen.queryByRole('textbox', {name: '파일 내 검색어'})).toBeNull()
  })

  it('should show a persistent deletion status without replacing the unsaved editor', async () => {
    const {editor, port, textbox} = mountEditor()
    editor.dispatch({changes: {from: 0, insert: 'unsaved text', to: editor.state.doc.length}})
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    globalThis.dispatchEvent(new Event('focus'))
    await vi.waitFor(
      () => {
        expect(screen.getByRole('status', {name: '파일 삭제 상태'})).toHaveTextContent(
          '파일이 삭제되었습니다. 다시 편집 후 저장하면 파일이 만들어집니다.',
        )
      },
      {interval: 1},
    )
    expect(screen.getByRole('textbox', {name: '코드 편집기'})).toBe(textbox)
    expect(editor.state.sliceDoc()).toBe('unsaved text')
  })

  it('should offer saving unchanged contents after a clean file is deleted', async () => {
    const {port} = mountEditor()
    fireEvent.click(screen.getByRole('button', {name: '편집'}))
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    globalThis.dispatchEvent(new Event('focus'))
    await vi.waitFor(
      () => {
        expect(screen.getByRole('status', {name: '파일 삭제 상태'})).toHaveTextContent(
          '파일이 삭제되었습니다. 다시 편집 후 저장하면 파일이 만들어집니다.',
        )
      },
      {interval: 1},
    )
    expect(screen.getByRole('button', {name: '저장'})).toBeEnabled()
    expect(screen.getByRole('textbox', {name: '코드 편집기'})).toHaveTextContent(
      'hello selected world',
    )
  })

  it('should share the started host connection with the file tree', async () => {
    const port: ViewerPort = {
      call: vi.fn().mockResolvedValue({
        content: [],
        structuredContent: {files: [{openable: true, path: 'main.ts'}], truncated: false},
      }),
      context: vi.fn().mockResolvedValue(undefined),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    const createPort = vi.fn(() => port)
    render(() => <SCodeViewer port={createPort()} />)
    vi.mocked(port.start).mock.calls[0]![0]({
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'hello'}]],
        location: {column: 1, line: 1, path: 'main.ts'},
        revision: 'first',
        source: 'hello',
      },
      session: 'session',
      workspace: '/project',
    })
    expect(screen.getByLabelText('작업 폴더')).toHaveTextContent('project')
    expect(screen.getByLabelText('작업 폴더')).toHaveAttribute('title', '/project')
    expect(screen.queryByRole('button', {name: '채팅창에 추가'})).toBeNull()
    fireEvent.click(screen.getByRole('button', {name: '파일 트리'}))
    expect(await screen.findByRole('treeitem', {name: 'main.ts'})).toBeTruthy()
    expect(screen.getByRole('complementary', {name: '파일 트리'})).not.toHaveTextContent('project')
    expect(createPort).toHaveBeenCalledTimes(1)
    expect(port.call).toHaveBeenCalledWith('code.tree', {session: 'session'})
    fireEvent.input(screen.getByRole('textbox', {name: '파일 필터링'}), {target: {value: 'main'}})
    fireEvent.click(screen.getByRole('button', {name: '파일 트리'}))
    fireEvent.click(screen.getByRole('button', {name: '파일 트리'}))
    const filter = screen.getByRole('textbox', {name: '파일 필터링'})
    expect(filter).toHaveProperty('value', 'main')
  })
  it('should display the workspace tree before choosing the first file from a menu panel', async () => {
    const port: ViewerPort = {
      call: vi.fn().mockResolvedValue({
        content: [],
        structuredContent: {files: [{openable: true, path: 'main.ts'}], truncated: false},
      }),
      context: vi.fn().mockResolvedValue(undefined),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    render(() => <SCodeViewer port={port} />)
    vi.mocked(port.start).mock.calls[0]![0]({session: 'workspace', workspace: '/project'})
    expect(screen.getByLabelText('작업 폴더')).toHaveTextContent('project')
    expect(await screen.findByRole('treeitem', {name: 'main.ts'})).toBeTruthy()
    expect(screen.getByRole('region', {name: '파일 내용'}).textContent).toContain('파일 트리에서')
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {
        document: {
          lines: [[]],
          location: {column: 1, line: 1, path: 'main.ts'},
          revision: 'first',
          source: '',
        },
      },
    })
    fireEvent.click(screen.getByRole('treeitem', {name: 'main.ts'}))
    await screen.findByLabelText('소스 코드')
    expect(port.call).toHaveBeenCalledWith(
      'code.read',
      expect.objectContaining({path: 'main.ts', session: 'workspace'}),
    )
    expect(port.call).not.toHaveBeenCalledWith('code.open', expect.anything())
    expect(screen.getByRole('button', {name: '파일 트리'})).toHaveProperty('disabled', false)
    expect(screen.queryByRole('button', {name: '채팅창에 추가'})).toBeNull()
    expect(port.call).toHaveBeenCalledWith('code.tree', {session: 'workspace'})
    fireEvent.click(screen.getByRole('button', {name: '파일 트리'}))
    expect(screen.queryByRole('tree')).toBeNull()
    expect(screen.getByLabelText('작업 폴더')).toHaveTextContent('project')
  })
  it('should show first-file guidance without listing the plugin installation directory', () => {
    const port: ViewerPort = {
      call: vi.fn(),
      context: vi.fn(),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    render(() => <SCodeViewer port={port} />)
    expect(screen.getByRole('region', {name: '파일 내용'}).textContent).toContain('절대 경로')
    expect(screen.getByRole('button', {name: '파일 트리'})).toHaveProperty('disabled', true)
    expect(screen.queryByLabelText('작업 폴더')).toBeNull()
    expect(port.call).not.toHaveBeenCalled()
  })

  it('should switch SVG to searchable source when the file-search shortcut is pressed', () => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:svg'), revokeObjectURL: vi.fn()})
    const source = '<svg><path/></svg>'
    const port: ViewerPort = {
      call: vi.fn().mockResolvedValue({
        content: [],
        structuredContent: {data: btoa(source), next: source.length},
      }),
      context: vi.fn(),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    render(() => <SCodeViewer port={port} />)
    vi.mocked(port.start).mock.calls[0]![0]({
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: source}]],
        location: {column: 1, line: 1, path: 'icon.svg'},
        media: {kind: 'image', mimeType: 'image/svg+xml', size: source.length},
        revision: 'svg-first',
        source,
      },
      session: 'session',
      workspace: '/project',
    })
    fireEvent.keyDown(document.body, {ctrlKey: true, key: 'f'})
    fireEvent.input(screen.getByRole('textbox', {name: '파일 내 검색어'}), {
      target: {value: 'path'},
    })
    expect(screen.getByLabelText('소스 코드').textContent).toContain(source)
    expect(screen.getByRole('status').textContent).toBe('1/1')
  })
  it('should accept local search while waiting for the first file and search that file on arrival', async () => {
    const port: ViewerPort = {
      call: vi.fn().mockResolvedValue({content: []}),
      context: vi.fn().mockResolvedValue(undefined),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    render(() => <SCodeViewer port={port} />)
    fireEvent.keyDown(document.body, {ctrlKey: true, key: 'f'})
    const input = screen.getByRole('textbox', {name: '파일 내 검색어'})
    fireEvent.input(input, {target: {value: 'hello'}})
    expect(screen.getByRole('status').textContent).toBe('결과 없음')
    vi.mocked(port.start).mock.calls[0]![0]({
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'hello hello'}]],
        location: {column: 1, line: 1, path: 'main.ts'},
        revision: 'first',
        source: 'hello hello',
      },
      session: 'session',
      workspace: '/project',
    })
    expect(screen.getByRole('status').textContent).toBe('1/2')
    fireEvent.keyDown(input, {key: 'Enter'})
    expect(screen.getByRole('status').textContent).toBe('2/2')
    fireEvent.keyDown(input, {key: 'Escape'})
    expect(screen.queryByRole('textbox', {name: '파일 내 검색어'})).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', {name: '1줄 선택'}))
    await Promise.resolve()
  })
})
