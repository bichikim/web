/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {ViewerConnection} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {SFileTree} from '../SFileTree'

const session: ViewerConnection = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'src/main.ts'},
    revision: 'first',
    source: '',
  },
  session: 'first',
  workspace: '/project',
}
const createPort = (): ViewerPort => {
  let files = [{openable: true, path: 'src/main.ts'}]
  return {
    call: vi.fn(async (name, input) => {
      switch (name) {
        case 'code.entry':
          return {
            content: [],
            structuredContent: {
              kind: input.path === 'src' ? 'directory' : 'file',
              path: input.path,
              revision: 'snapshot',
            },
          }
        case 'code.rename': {
          const path = `src/${input.name}`
          files = files.map((file) => (file.path === input.path ? {...file, path} : file))
          return {content: [], structuredContent: {kind: 'file', path}}
        }
        case 'code.transfer': {
          const path = `${input.parent}/main.ts`
          if (input.action === 'cut') {
            files = files.filter((file) => file.path !== input.path)
          }
          files.push({openable: true, path})
          return {content: [], structuredContent: {kind: 'file', path}}
        }
        case 'code.remove':
          files = files.filter((file) => file.path !== input.path)
          return {content: [], structuredContent: {kind: 'file', path: input.path}}
        default:
          return {
            content: [],
            structuredContent: {directories: ['src', 'dest'], files: [...files], truncated: false},
          }
      }
    }),
    context: vi.fn(),
    start: vi.fn().mockResolvedValue(() => {}),
  }
}
const originals = new Map([
  ['showPopover', Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')],
  ['showModal', Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')],
  ['close', Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')],
])
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    },
  })
})
afterEach(() => {
  cleanup()
  for (const [name, descriptor] of originals) {
    const prototype = name === 'showPopover' ? HTMLElement.prototype : HTMLDialogElement.prototype
    if (descriptor === undefined) {
      Reflect.deleteProperty(prototype, name)
    } else {
      Object.defineProperty(prototype, name, descriptor)
    }
  }
})
const menu = (name: string) => fireEvent.contextMenu(screen.getByRole('treeitem', {name}))

describe('SFileTree file operations', () => {
  it('should rename through the context menu and reveal the renamed entry', async () => {
    const port = createPort()
    const changed = vi.fn().mockResolvedValue(undefined)
    render(() => <SFileTree port={port} session={session} visible onMutation={changed} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('main.ts')
    fireEvent.click(screen.getByRole('menuitem', {name: '이름 변경'}))
    const dialog = await screen.findByRole('dialog', {name: '이름 변경'})
    expect(within(dialog).getByRole('textbox', {name: '이름'})).toHaveValue('main.ts')
    const confirmation = dialog
    fireEvent.input(within(confirmation).getByRole('textbox', {name: '이름'}), {
      target: {value: 'helper.ts'},
    })
    fireEvent.submit(within(confirmation).getByRole('button', {name: '변경'}).closest('form')!)
    await screen.findByRole('treeitem', {name: 'helper.ts'})
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    expect(port.call).toHaveBeenCalledWith('code.rename', {
      name: 'helper.ts',
      path: 'src/main.ts',
      revision: 'snapshot',
      session: 'first',
    })
    expect(changed).toHaveBeenCalledWith({
      action: 'rename',
      entry: {kind: 'file', path: 'src/helper.ts'},
      source: 'src/main.ts',
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('should cancel renaming without changing the entry', async () => {
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('main.ts')
    fireEvent.click(screen.getByRole('menuitem', {name: '이름 변경'}))
    const dialog = await screen.findByRole('dialog', {name: '이름 변경'})
    fireEvent.click(within(dialog).getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(port.call).not.toHaveBeenCalledWith('code.rename', expect.anything())
  })
  it('should copy an entry through its context menu and paste into a closed folder', async () => {
    const port = createPort()
    const changed = vi.fn().mockResolvedValue(undefined)
    render(() => <SFileTree port={port} session={session} visible onMutation={changed} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('main.ts')
    expect(screen.getByRole('menuitem', {name: /^붙여넣기/u})).toBeDisabled()
    fireEvent.click(screen.getByRole('menuitem', {name: /^복사/u}))
    await screen.findByText(/대상 폴더에 붙여넣으세요/u)
    menu('dest')
    fireEvent.click(screen.getByRole('menuitem', {name: /^붙여넣기/u}))
    await waitFor(() =>
      expect(screen.getByRole('treeitem', {name: 'dest'})).toHaveAttribute('aria-expanded', 'true'),
    )
    expect(screen.getAllByRole('treeitem', {name: 'main.ts'})).toHaveLength(2)
    expect(port.call).toHaveBeenCalledWith('code.transfer', {
      action: 'copy',
      parent: 'dest',
      path: 'src/main.ts',
      revision: 'snapshot',
      session: 'first',
    })
    expect(changed).toHaveBeenCalledWith({
      action: 'copy',
      entry: {kind: 'file', path: 'dest/main.ts'},
      source: 'src/main.ts',
    })
    await screen.findByText('dest/main.ts · 붙여넣었습니다.')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('should display clipboard feedback in a dismissible toast without clearing the clipboard', async () => {
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('main.ts')
    fireEvent.click(screen.getByRole('menuitem', {name: /^복사/u}))
    const message = await screen.findByRole('status')
    expect(message.textContent).toContain('복사했습니다.')
    expect(message.closest('[popover]')).toHaveAttribute('popover', 'manual')
    fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
    expect(screen.queryByText(/복사했습니다/u)).toBeNull()
    menu('dest')
    expect(screen.getByRole('menuitem', {name: /^붙여넣기/u})).not.toBeDisabled()
  })
  it('should remove the toast after its lifetime animation completes', async () => {
    render(() => <SFileTree port={createPort()} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('main.ts')
    fireEvent.click(screen.getByRole('menuitem', {name: /^복사/u}))
    const message = await screen.findByRole('status')
    const toast = message.closest('[popover]')!
    fireEvent.animationEnd(toast)
    expect(screen.queryByText(/복사했습니다/u)).toBeNull()
    expect(screen.queryByRole('button', {name: '알림 닫기'})).toBeNull()
  })
  it('should cut and paste with keyboard shortcuts and consume the clipboard after the move', async () => {
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible />)
    const source = await screen.findByRole('treeitem', {name: 'main.ts'})
    fireEvent.keyDown(source, {ctrlKey: true, key: 'x'})
    await screen.findByText(/잘라내기했습니다/u)
    expect(source).toHaveClass('opacity-50')
    fireEvent.keyDown(screen.getByRole('treeitem', {name: 'dest'}), {ctrlKey: true, key: 'v'})
    await screen.findByText(/dest\/main.ts · 붙여넣었습니다/u)
    expect(screen.getAllByRole('treeitem', {name: 'main.ts'})).toHaveLength(1)
    menu('dest')
    expect(screen.getByRole('menuitem', {name: /^붙여넣기/u})).toBeDisabled()
    expect(port.call).toHaveBeenCalledWith('code.transfer', {
      action: 'cut',
      parent: 'dest',
      path: 'src/main.ts',
      revision: 'snapshot',
      session: 'first',
    })
  })
  it('should require explicit confirmation and allow cancel before deleting and refreshing the tree', async () => {
    const port = createPort()
    const changed = vi.fn().mockResolvedValue(undefined)
    render(() => <SFileTree port={port} session={session} visible onMutation={changed} />)
    const source = await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('main.ts')
    fireEvent.click(screen.getByRole('menuitem', {name: /^삭제/u}))
    const dialog = await screen.findByRole('dialog', {name: '파일 삭제'})
    expect(dialog.textContent).toContain('src/main.ts')
    expect(dialog.textContent).toContain('휴지통을 거치지 않고 삭제')
    expect(port.call).not.toHaveBeenCalledWith('code.remove', expect.anything())
    fireEvent.click(within(dialog).getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(source, {key: 'Delete'})
    const confirmation = await screen.findByRole('dialog', {name: '파일 삭제'})
    fireEvent.click(within(confirmation).getByRole('button', {name: '삭제'}))
    await screen.findByText('src/main.ts · 삭제했습니다.')
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    expect(changed).toHaveBeenCalledWith({
      action: 'delete',
      entry: {kind: 'file', path: 'src/main.ts'},
      source: 'src/main.ts',
    })
    expect(port.call).toHaveBeenCalledWith('code.remove', {
      path: 'src/main.ts',
      revision: 'snapshot',
      session: 'first',
    })
  })
  it('should protect unsaved files and disable mutations on the workspace root', async () => {
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible pendingPaths={['src/main.ts']} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    menu('src')
    fireEvent.click(screen.getByRole('menuitem', {name: '이름 변경'}))
    await screen.findByText(/미저장 변경을 먼저 저장/u)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(port.call).not.toHaveBeenCalledWith('code.entry', expect.anything())
    fireEvent.contextMenu(screen.getByRole('tree'))
    expect(screen.getByRole('menuitem', {name: /^복사/u})).toBeDisabled()
    expect(screen.getByRole('menuitem', {name: /^잘라내기/u})).toBeDisabled()
    expect(screen.getByRole('menuitem', {name: /^삭제/u})).toBeDisabled()
    expect(screen.getByRole('menuitem', {name: '이름 변경'})).toBeDisabled()
  })
})
