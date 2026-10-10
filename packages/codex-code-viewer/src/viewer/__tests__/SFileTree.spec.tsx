/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {SFileTree} from '../SFileTree'

const session: ViewerSession = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'src/main.ts'},
    revision: 'first',
    source: '',
  },
  session: 'first',
  workspace: '/project',
}
const files = [
  {openable: true, path: 'src/main.ts'},
  {openable: true, path: 'src/editor.tsx'},
  {openable: true, path: 'test/other.js'},
  {openable: false, path: 'README.md'},
]
const createPort = (): ViewerPort => ({
  call: vi.fn().mockResolvedValue({content: [], structuredContent: {files, truncated: false}}),
  context: vi.fn(),
  start: vi.fn().mockResolvedValue(() => {}),
})
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
const scrollIntoView = vi.fn()
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterEach(() => {
  cleanup()
  if (originalScroll === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  }
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})

describe('SFileTree', () => {
  const recordScroll = (): void => {
    scrollIntoView.mockClear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
  }

  it('should refresh automatically after a workspace event without opening collapsed folders', async () => {
    recordScroll()
    const port = createPort()
    const [revision, changeRevision] = createSignal(0)
    render(() => <SFileTree port={port} session={session} visible revision={revision()} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    fireEvent.click(screen.getByRole('treeitem', {name: 'src'}))
    const tree = screen.getByRole('tree', {name: '프로젝트 파일'})
    tree.scrollTop = 80
    scrollIntoView.mockClear()
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {
        files: [...files, {openable: true, path: 'added.txt'}],
        truncated: false,
      },
    })
    changeRevision(1)
    await screen.findByRole('treeitem', {name: 'added.txt'})
    expect(screen.getByRole('treeitem', {name: 'src'}).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    expect(tree.scrollTop).toBe(80)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
  it('should expand every ancestor and scroll to the current file on every reveal request', async () => {
    recordScroll()
    const port = createPort()
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      structuredContent: {
        files: [{openable: true, path: 'src/deep/main.ts'}],
        truncated: false,
      },
    })
    const current = {
      ...session,
      document: {...session.document, location: {column: 1, line: 1, path: 'src/deep/main.ts'}},
    }
    const open = vi.fn()
    render(() => <SFileTree port={port} session={current} visible onOpen={open} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    await Promise.resolve()
    scrollIntoView.mockClear()
    fireEvent.click(screen.getByRole('treeitem', {name: 'deep'}))
    fireEvent.click(screen.getByRole('treeitem', {name: 'src'}))
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    const reveal = screen.getByRole('button', {name: '현재 파일 위치로 이동'})
    fireEvent.click(reveal)
    await Promise.resolve()
    const file = screen.getByRole('treeitem', {name: 'main.ts'})
    expect(screen.getByRole('treeitem', {name: 'src'}).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('treeitem', {name: 'deep'}).getAttribute('aria-expanded')).toBe('true')
    expect(file.getAttribute('aria-selected')).toBe('true')
    expect(file.tabIndex).toBe(0)
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(file)
    fireEvent.click(reveal)
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2))
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(file)
    expect(open).not.toHaveBeenCalled()
  })

  it('should refresh the tree without reopening folders or scrolling back to the current file', async () => {
    recordScroll()
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    await Promise.resolve()
    const calls = scrollIntoView.mock.calls.length
    fireEvent.click(screen.getByRole('treeitem', {name: 'src'}))
    await waitFor(() => expect(screen.getByRole('tree')).toHaveAttribute('aria-busy', 'false'))
    const pending = Promise.withResolvers<Awaited<ReturnType<ViewerPort['call']>>>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    const refresh = screen.getByRole('button', {name: '파일 트리 새로고침'})
    fireEvent.click(refresh)
    expect(refresh).toBeDisabled()
    pending.resolve({
      content: [],
      structuredContent: {directories: ['src', 'empty'], files, truncated: false},
    })
    await screen.findByRole('treeitem', {name: 'empty'})
    expect(refresh).not.toBeDisabled()
    expect(screen.getByRole('treeitem', {name: 'src'})).toHaveAttribute('aria-expanded', 'false')
    expect(scrollIntoView).toHaveBeenCalledTimes(calls)
    expect(port.call).toHaveBeenCalledTimes(3)
    expect(port.call).toHaveBeenLastCalledWith('code.tree', {
      directories: [''],
      session: 'first',
      stream: true,
    })
  })
  it('should retain the tree filter and display newly discovered matching files after refresh', async () => {
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    const filter = screen.getByRole('textbox', {name: '파일 필터링'})
    fireEvent.input(filter, {target: {value: 'editor'}})
    await waitFor(() => expect(screen.getByRole('tree')).toHaveAttribute('aria-busy', 'false'))
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {
        files: [...files, {openable: true, path: 'src/editor-new.ts'}],
        truncated: false,
      },
    })
    fireEvent.click(screen.getByRole('button', {name: '파일 트리 새로고침'}))
    await screen.findByRole('treeitem', {name: 'editor-new.ts'})
    expect(filter).toHaveValue('editor')
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
  })

  it('should clear a filter that hides the current file before revealing it', async () => {
    recordScroll()
    render(() => <SFileTree port={createPort()} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    await Promise.resolve()
    fireEvent.click(screen.getByRole('treeitem', {name: 'src'}))
    const filter = screen.getByRole('textbox', {name: '파일 필터링'})
    fireEvent.input(filter, {target: {value: 'other'}})
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    scrollIntoView.mockClear()
    fireEvent.click(screen.getByRole('button', {name: '현재 파일 위치로 이동'}))
    await Promise.resolve()
    expect(filter).toHaveProperty('value', '')
    const file = screen.getByRole('treeitem', {name: 'main.ts'})
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(file)
  })

  it('should disable reveal when no document is open in the workspace', async () => {
    render(() => (
      <SFileTree port={createPort()} session={{session: 'first', workspace: '/project'}} visible />
    ))
    await screen.findByRole('treeitem', {name: 'src'})
    expect(screen.getByRole('button', {name: '현재 파일 위치로 이동'})).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('should preserve scroll when folders toggle and the filter changes after revealing the file', async () => {
    recordScroll()
    render(() => <SFileTree port={createPort()} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    await Promise.resolve()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    const folder = screen.getByRole('treeitem', {name: 'test'})
    fireEvent.click(folder)
    await Promise.resolve()
    expect(screen.getByRole('treeitem', {name: 'other.js'})).toBeDefined()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    fireEvent.click(folder)
    await Promise.resolve()
    expect(screen.queryByRole('treeitem', {name: 'other.js'})).toBeNull()
    fireEvent.input(screen.getByRole('textbox', {name: '파일 필터링'}), {target: {value: 'src/'}})
    await Promise.resolve()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
  })

  it('should reveal a different opened file and reveal it again when the tree reopens', async () => {
    recordScroll()
    const [current, setCurrent] = createSignal(session)
    const [visible, setVisible] = createSignal(true)
    render(() => <SFileTree port={createPort()} session={current()} visible={visible()} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    await Promise.resolve()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    setCurrent({
      ...session,
      document: {...session.document, location: {column: 1, line: 1, path: 'test/other.js'}},
    })
    await Promise.resolve()
    const currentItem = screen.getByRole('treeitem', {name: 'other.js'})
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(currentItem)
    setVisible(false)
    setVisible(true)
    await Promise.resolve()
    expect(scrollIntoView).toHaveBeenCalledTimes(3)
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(
      screen.getByRole('treeitem', {name: 'other.js'}),
    )
  })

  it('keeps visible focus ahead of selection and falls back when the filter hides both', async () => {
    render(() => <SFileTree port={createPort()} session={session} visible />)
    const current = await screen.findByRole('treeitem', {name: 'main.ts'})
    expect(current.tabIndex).toBe(0)
    const other = screen.getByRole('treeitem', {name: 'editor.tsx'})
    other.focus()
    expect(other.tabIndex).toBe(0)
    expect(current.tabIndex).toBe(-1)
    expect(current.getAttribute('aria-selected')).toBe('true')
    const input = screen.getByRole('textbox', {name: '파일 필터링'})
    fireEvent.input(input, {target: {value: 'other'}})
    expect(screen.getByRole('treeitem', {name: 'test'}).tabIndex).toBe(0)
    fireEvent.input(input, {target: {value: 'missing'}})
    expect(screen.queryAllByRole('treeitem')).toHaveLength(0)
    fireEvent.input(input, {target: {value: ''}})
    expect(screen.getByRole('treeitem', {name: 'main.ts'}).tabIndex).toBe(0)
  })

  it.each([
    ['editor.tsx', '/project/src/editor.tsx'],
    ['src', '/project/src'],
  ])('should copy the absolute path for %s without opening or toggling it', async (name, path) => {
    const copy = vi.fn()
    const open = vi.fn()
    const share = vi.fn()
    render(() => (
      <SFileTree
        port={createPort()}
        session={session}
        visible
        onCopy={copy}
        onOpen={open}
        onShare={share}
      />
    ))
    const item = await screen.findByRole('treeitem', {name})
    const expanded = item.getAttribute('aria-expanded')
    fireEvent.contextMenu(item)
    fireEvent.click(screen.getByRole('menuitem', {name: /^경로 복사/u}))
    expect(copy).toHaveBeenCalledWith(path)
    expect(open).not.toHaveBeenCalled()
    expect(share).not.toHaveBeenCalled()
    expect(item.getAttribute('aria-expanded')).toBe(expanded)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(item)
  })

  it.each([
    ['file', 'editor.tsx', 'src/editor.tsx'],
    ['directory', 'src', 'src'],
    ['file', 'README.md', 'README.md'],
  ])('should add the %s path for %s without opening or toggling it', async (kind, name, path) => {
    const open = vi.fn()
    const share = vi.fn()
    render(() => (
      <SFileTree port={createPort()} session={session} visible onOpen={open} onShare={share} />
    ))
    const item = await screen.findByRole('treeitem', {name})
    const expanded = item.getAttribute('aria-expanded')
    fireEvent.contextMenu(item, {clientX: 100, clientY: 200})
    const action = screen.getByRole('menuitem', {name: '채팅창에 추가'})
    expect(document.activeElement).toBe(screen.getByRole('menuitem', {name: /^복사/u}))
    fireEvent.click(action)
    expect(share).toHaveBeenCalledWith({kind, path: `/project/${path}`})
    expect(open).not.toHaveBeenCalled()
    expect(item.getAttribute('aria-expanded')).toBe(expanded)
    expect(screen.getByRole('treeitem', {name: 'main.ts'}).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(item)
  })

  it('should open the folder menu with Shift+F10 and restore row focus on Escape', async () => {
    render(() => <SFileTree port={createPort()} session={session} visible onShare={vi.fn()} />)
    const item = await screen.findByRole('treeitem', {name: 'src'})
    fireEvent.keyDown(item, {key: 'F10', shiftKey: true})
    const action = screen.getByRole('menuitem', {name: '채팅창에 추가'})
    fireEvent.keyDown(action, {key: 'Escape'})
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(item)
    expect(item.getAttribute('aria-expanded')).toBe('true')
  })

  it('should close the tree menu when the workspace changes', async () => {
    const [current, setCurrent] = createSignal(session)
    const share = vi.fn()
    render(() => <SFileTree port={createPort()} session={current()} visible onShare={share} />)
    const item = await screen.findByRole('treeitem', {name: 'src'})
    fireEvent.contextMenu(item)
    expect(screen.getByRole('menu')).toBeDefined()
    setCurrent({...session, session: 'other', workspace: '/other'})
    expect(screen.queryByRole('menu')).toBeNull()
    expect(share).not.toHaveBeenCalled()
  })

  it('should open current ancestors, select the current file, and filter without losing input focus', async () => {
    const port = createPort()
    const open = vi.fn()
    render(() => <SFileTree port={port} session={session} visible onOpen={open} />)
    await waitFor(() =>
      expect(screen.getByRole('treeitem', {name: 'main.ts'}).getAttribute('aria-selected')).toBe(
        'true',
      ),
    )
    expect(screen.getByRole('treeitem', {name: 'src'}).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('treeitem', {name: 'README.md'}).getAttribute('aria-disabled')).toBe(
      'true',
    )
    const input = screen.getByRole('textbox', {name: '파일 필터링'})
    fireEvent.input(input, {target: {value: 'other'}})
    expect(screen.queryByRole('treeitem', {name: 'src'})).toBeNull()
    fireEvent.click(screen.getByRole('treeitem', {name: 'other.js'}))
    expect(open).toHaveBeenCalledWith({column: 1, line: 1, path: 'test/other.js'})
    expect(screen.getByRole('textbox', {name: '파일 필터링'})).toBe(input)
  })

  it('should collapse and expand a folder while preserving its DOM and keyboard navigation', async () => {
    render(() => <SFileTree port={createPort()} session={session} visible />)
    const folder = await screen.findByRole('treeitem', {name: 'src'})
    fireEvent.click(folder)
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    fireEvent.keyDown(folder, {key: 'ArrowRight'})
    expect(screen.getByRole('treeitem', {name: 'src'})).toBe(folder)
    const file = screen.getByRole('treeitem', {name: 'editor.tsx'})
    fireEvent.keyDown(folder, {key: 'ArrowRight'})
    expect(document.activeElement).toBe(file)
    fireEvent.keyDown(file, {key: 'ArrowLeft'})
    expect(document.activeElement).toBe(folder)
  })

  it('should discard a stale workspace response and reload when the tree is reopened', async () => {
    const port = createPort()
    const pending = Promise.withResolvers<Awaited<ReturnType<ViewerPort['call']>>>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    const [current, setCurrent] = createSignal(session)
    const [visible, setVisible] = createSignal(true)
    render(() => <SFileTree port={port} session={current()} visible={visible()} />)
    setCurrent({...session, session: 'second', workspace: '/other'})
    await waitFor(() => expect(screen.getByRole('treeitem', {name: 'main.ts'})).toBeDefined())
    pending.resolve({
      content: [],
      structuredContent: {files: [{openable: true, path: 'stale.ts'}], truncated: false},
    })
    await pending.promise
    expect(screen.queryByRole('treeitem', {name: 'stale.ts'})).toBeNull()
    setVisible(false)
    expect(screen.queryByRole('tree')).toBeNull()
    setVisible(true)
    await waitFor(() => expect(port.call).toHaveBeenCalledTimes(4))
    expect(port.call).toHaveBeenLastCalledWith('code.tree', {
      directories: ['', 'src'],
      session: 'second',
      stream: true,
    })
  })

  it('should retain files and the filter when navigating inside the same session', async () => {
    const port = createPort()
    const [current, setCurrent] = createSignal(session)
    render(() => <SFileTree port={port} session={current()} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    const input = screen.getByRole('textbox', {name: '파일 필터링'})
    fireEvent.input(input, {target: {value: 'src/'}})
    setCurrent({
      ...session,
      document: {...session.document, location: {column: 1, line: 1, path: 'src/editor.tsx'}},
    })
    expect(screen.getByRole('treeitem', {name: 'editor.tsx'}).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect((input as HTMLInputElement).value).toBe('src/')
    expect(port.call).toHaveBeenCalledTimes(2)
  })
})
