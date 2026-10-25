/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {SFileTree} from '../SFileTree'

vi.mock('../SFileTreeToolbar', () => ({SFileTreeToolbar: () => null}))

const session: ViewerSession = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'src/main.ts'},
    revision: 'first',
    source: 'unsaved content stays in the current viewer',
  },
  session: 'first',
  workspace: '/project/',
}
const createPort = (): ViewerPort => ({
  call: vi.fn().mockResolvedValue({
    content: [],
    structuredContent: {
      files: [
        {openable: true, path: 'src/main.ts'},
        {openable: true, path: 'src/other file.ts'},
        {openable: false, path: 'README.md'},
      ],
      truncated: false,
    },
  }),
  context: vi.fn(),
  start: vi.fn().mockResolvedValue(() => {}),
})
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterEach(() => {
  cleanup()
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})

describe('SFileTree host tabs', () => {
  it('should open an ordinary click in the current viewer', async () => {
    const openFile = vi.fn().mockResolvedValue(undefined)
    const onOpen = vi.fn()
    render(() => (
      <SFileTree port={{...createPort(), openFile}} session={session} visible onOpen={onOpen} />
    ))
    fireEvent.click(await screen.findByRole('treeitem', {name: 'other file.ts'}))
    expect(onOpen).toHaveBeenCalledWith({column: 1, line: 1, path: 'src/other file.ts'})
    expect(openFile).not.toHaveBeenCalled()
  })

  it.each([{metaKey: true}, {ctrlKey: true}])(
    'should delegate a modified click without navigating the current viewer: %s',
    async (modifier) => {
      const openFile = vi.fn().mockResolvedValue(undefined)
      const onOpen = vi.fn()
      render(() => (
        <SFileTree port={{...createPort(), openFile}} session={session} visible onOpen={onOpen} />
      ))
      fireEvent.click(await screen.findByRole('treeitem', {name: 'other file.ts'}), modifier)
      expect(openFile).toHaveBeenCalledWith('/project/src/other file.ts')
      expect(onOpen).not.toHaveBeenCalled()
      expect(screen.getByRole('treeitem', {name: 'main.ts'}).getAttribute('aria-selected')).toBe(
        'true',
      )
    },
  )

  it('should open a context menu file through the same host API and restore focus', async () => {
    const openFile = vi.fn().mockResolvedValue(undefined)
    const onOpen = vi.fn()
    render(() => (
      <SFileTree port={{...createPort(), openFile}} session={session} visible onOpen={onOpen} />
    ))
    const file = await screen.findByRole('treeitem', {name: 'other file.ts'})
    fireEvent.contextMenu(file)
    fireEvent.click(screen.getByRole('menuitem', {name: '새 탭에서 열기'}))
    expect(openFile).toHaveBeenCalledWith('/project/src/other file.ts')
    expect(onOpen).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(file)
  })

  it('should keep folder activation local and omit the new tab menu for folders', async () => {
    const openFile = vi.fn().mockResolvedValue(undefined)
    render(() => <SFileTree port={{...createPort(), openFile}} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    const folder = screen.getByRole('treeitem', {name: 'src'})
    fireEvent.click(folder, {metaKey: true})
    expect(folder.getAttribute('aria-expanded')).toBe('false')
    fireEvent.contextMenu(folder)
    expect(screen.queryByRole('menuitem', {name: '새 탭에서 열기'})).toBeNull()
    expect(openFile).not.toHaveBeenCalled()
  })

  it('should preserve local activation and hide the menu action without a host API', async () => {
    const onOpen = vi.fn()
    render(() => <SFileTree port={createPort()} session={session} visible onOpen={onOpen} />)
    const file = await screen.findByRole('treeitem', {name: 'other file.ts'})
    fireEvent.click(file, {ctrlKey: true})
    expect(onOpen).toHaveBeenCalledOnce()
    fireEvent.contextMenu(file)
    expect(screen.queryByRole('menuitem', {name: '새 탭에서 열기'})).toBeNull()
  })

  it('should report host failures without opening the file in the current viewer', async () => {
    const error = new Error('file opening failed')
    const openFile = vi.fn().mockRejectedValue(error)
    const onError = vi.fn()
    const onOpen = vi.fn()
    render(() => (
      <SFileTree
        port={{...createPort(), openFile}}
        session={session}
        visible
        onOpen={onOpen}
        onError={onError}
      />
    ))
    fireEvent.click(await screen.findByRole('treeitem', {name: 'other file.ts'}), {metaKey: true})
    await waitFor(() => expect(onError).toHaveBeenCalledWith(error))
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('should let the host open formats unavailable in the current viewer', async () => {
    const openFile = vi.fn().mockResolvedValue(undefined)
    render(() => <SFileTree port={{...createPort(), openFile}} session={session} visible />)
    fireEvent.contextMenu(await screen.findByRole('treeitem', {name: 'README.md'}))
    fireEvent.click(screen.getByRole('menuitem', {name: '새 탭에서 열기'}))
    expect(openFile).toHaveBeenCalledWith('/project/README.md')
  })
})
