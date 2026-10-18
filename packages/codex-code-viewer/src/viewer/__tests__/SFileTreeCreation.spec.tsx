/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
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
  const files = [{openable: true, path: 'src/main.ts'}]
  const directories = ['src']
  return {
    call: vi.fn(async (name, input) => {
      if (name === 'code.create') {
        const path = `${input.parent}/${input.name}`.replace(/^\//, '')
        if (input.kind === 'file') {
          files.push({openable: true, path})
        } else {
          directories.push(path)
        }
        return {content: [], structuredContent: {kind: input.kind, path}}
      }
      return {
        content: [],
        structuredContent: {directories: [...directories], files: [...files], truncated: false},
      }
    }),
    context: vi.fn(),
    start: vi.fn().mockResolvedValue(() => {}),
  }
}
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeEach(() => {
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
    },
  })
})
afterEach(() => {
  cleanup()
  for (const [name, descriptor] of [
    ['showModal', originalShow],
    ['close', originalClose],
  ] as const) {
    if (descriptor) {
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, name)
    }
  }
})
const submit = (name: string) => {
  fireEvent.input(screen.getByRole('textbox', {name: '이름'}), {target: {value: name}})
  fireEvent.submit(screen.getByRole('button', {name: '만들기'}).closest('form')!)
}
describe('file tree creation', () => {
  it('should create and open a sibling of the selected file', async () => {
    const port = createPort()
    const onOpen = vi.fn()
    render(() => <SFileTree port={port} session={session} visible onOpen={onOpen} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    fireEvent.click(screen.getByRole('button', {name: '새 파일'}))
    expect(screen.getByRole('dialog').textContent).toContain('src')
    submit('new.ts')
    await screen.findByRole('treeitem', {name: 'new.ts'})
    expect(port.call).toHaveBeenCalledWith('code.create', {
      kind: 'file',
      name: 'new.ts',
      parent: 'src',
      session: 'first',
    })
    await waitFor(() =>
      expect(onOpen).toHaveBeenCalledWith({column: 1, line: 1, path: 'src/new.ts'}),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('should create a visible empty folder inside the selected folder even when it was collapsed', async () => {
    const port = createPort()
    render(() => <SFileTree port={port} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    fireEvent.click(screen.getByRole('treeitem', {name: 'src'}))
    fireEvent.click(screen.getByRole('button', {name: '새 폴더'}))
    submit('empty')
    const folder = await screen.findByRole('treeitem', {name: 'empty'})
    expect(folder.getAttribute('aria-level')).toBe('2')
    expect(folder.tabIndex).toBe(0)
    expect(screen.getByRole('treeitem', {name: 'src'}).getAttribute('aria-expanded')).toBe('true')
  })
  it('should retain the name and display a collision error so the user can retry', async () => {
    const port = createPort()
    vi.mocked(port.call).mockImplementation(async (name) =>
      name === 'code.create'
        ? {content: [], isError: true, structuredContent: {code: 'already-exists'}}
        : {
            content: [],
            structuredContent: {files: [{openable: true, path: 'src/main.ts'}], truncated: false},
          },
    )
    render(() => <SFileTree port={port} session={session} visible />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    fireEvent.click(screen.getByRole('button', {name: '새 파일'}))
    submit('main.ts')
    await screen.findByRole('alert')
    expect(screen.getByRole('textbox', {name: '이름'})).toHaveValue('main.ts')
    expect(screen.getByRole('alert').textContent).toContain('이미')
    expect(document.activeElement).toBe(screen.getByRole('textbox', {name: '이름'}))
    expect(screen.getByRole('button', {name: '만들기'})).not.toBeDisabled()
  })
  it('should create in the root of an empty workspace', async () => {
    const port = createPort()
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      structuredContent: {directories: [], files: [], truncated: false},
    })
    render(() => (
      <SFileTree port={port} session={{session: 'first', workspace: '/project'}} visible />
    ))
    await screen.findByText('표시할 파일이 없습니다.')
    fireEvent.click(screen.getByRole('button', {name: '새 파일'}))
    submit('root.txt')
    await waitFor(() =>
      expect(port.call).toHaveBeenCalledWith('code.create', {
        kind: 'file',
        name: 'root.txt',
        parent: '',
        session: 'first',
      }),
    )
  })
  it('should ignore a completed creation from a workspace that has since changed', async () => {
    const port = createPort()
    let complete: (value: Awaited<ReturnType<ViewerPort['call']>>) => void = () => {}
    const creation = new Promise<Awaited<ReturnType<ViewerPort['call']>>>((resolve) => {
      complete = resolve
    })
    vi.mocked(port.call).mockImplementation(async (name) =>
      name === 'code.create'
        ? creation
        : {
            content: [],
            structuredContent: {files: [{openable: true, path: 'src/main.ts'}], truncated: false},
          },
    )
    const [current, change] = createSignal<ViewerConnection>(session)
    const open = vi.fn()
    render(() => <SFileTree port={port} session={current()} visible onOpen={open} />)
    await screen.findByRole('treeitem', {name: 'main.ts'})
    fireEvent.click(screen.getByRole('button', {name: '새 파일'}))
    submit('late.ts')
    change({...session, session: 'second'})
    complete({content: [], structuredContent: {kind: 'file', path: 'src/late.ts'}})
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(open).not.toHaveBeenCalled()
  })
})
