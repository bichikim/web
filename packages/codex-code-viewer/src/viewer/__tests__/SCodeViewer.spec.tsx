/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SCodeViewer} from '../SCodeViewer'
import type {ViewerPort} from '../types'

describe('SCodeViewer', () => {
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
    fireEvent.click(screen.getByRole('button', {name: '파일 트리'}))
    expect(await screen.findByRole('treeitem', {name: 'main.ts'})).toBeTruthy()
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
    expect(screen.getByRole('button', {name: '채팅창에 추가'})).toHaveProperty('disabled', false)
    expect(port.call).toHaveBeenCalledWith('code.tree', {session: 'workspace'})
    fireEvent.click(screen.getByRole('button', {name: '파일 트리'}))
    expect(screen.queryByRole('tree')).toBeNull()
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
