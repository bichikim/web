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
