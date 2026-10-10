/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ScanBatch, WorkspaceSession} from '../../shared/contracts'
import {SFileTree} from '../SFileTree'
import type {ViewerPort} from '../types'

interface ControlledStream {
  readonly send: (batch: ScanBatch) => void
  readonly finish: () => void
  readonly signal: AbortSignal
  readonly cancelled: ReturnType<typeof vi.fn>
}
const setup = () => {
  const waiting: ((stream: ControlledStream) => void)[] = []
  const available: ControlledStream[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, options: RequestInit) => {
      const cancelled = vi.fn()
      const response = new Response(
        new ReadableStream<Uint8Array>({
          cancel: cancelled,
          start: (controller) => {
            const send = (value: unknown) =>
              controller.enqueue(new TextEncoder().encode(`${JSON.stringify(value)}\n`))
            const stream = {
              cancelled,
              finish: () => {
                send({done: true})
                controller.close()
              },
              send,
              signal: options.signal!,
            }
            const receive = waiting.shift()
            if (receive === undefined) {
              available.push(stream)
            } else {
              receive(stream)
            }
          },
        }),
      )
      return Promise.resolve(response)
    }),
  )
  const port: ViewerPort = {
    call: vi.fn().mockResolvedValue({
      content: [],
      structuredContent: {url: 'http://127.0.0.1:4321/scan/test'},
    }),
    context: vi.fn(),
    start: vi.fn().mockResolvedValue(() => {}),
  }
  return {
    port,
    stream: (): Promise<ControlledStream> => {
      const stream = available.shift()
      return stream === undefined
        ? new Promise((resolve) => {
            waiting.push(resolve)
          })
        : Promise.resolve(stream)
    },
  }
}
const rootBatch: ScanBatch = {complete: true, directories: ['src'], directory: '', files: []}
const sourceBatch: ScanBatch = {
  complete: true,
  directories: [],
  directory: 'src',
  files: [{openable: true, path: 'src/main.ts'}],
}
const session: WorkspaceSession = {session: 'first', workspace: '/project'}

describe('SFileTree streaming', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })
  it('should show early results and request only expanded folders after clicks and updates', async () => {
    const {port, stream} = setup()
    const [revision, setRevision] = createSignal(0)
    const initial = stream()
    render(() => <SFileTree port={port} session={session} visible revision={revision()} />)
    const root = await initial
    root.send(rootBatch)
    const folder = await screen.findByRole('treeitem', {name: 'src'})
    expect(screen.getByRole('tree')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    root.finish()
    const expansion = stream()
    fireEvent.click(folder)
    const expanded = await expansion
    expect(port.call).toHaveBeenLastCalledWith('code.tree', {
      directories: ['', 'src'],
      session: 'first',
      stream: true,
    })
    expanded.send(rootBatch)
    expanded.send(sourceBatch)
    expanded.finish()
    await screen.findByRole('treeitem', {name: 'main.ts'})
    const collapse = stream()
    fireEvent.click(folder)
    const collapsed = await collapse
    collapsed.send(rootBatch)
    collapsed.finish()
    const update = stream()
    setRevision(1)
    const refreshed = await update
    expect(port.call).toHaveBeenLastCalledWith('code.tree', {
      directories: [''],
      session: 'first',
      stream: true,
    })
    refreshed.send({...rootBatch, files: [{openable: true, path: 'added.ts'}]})
    refreshed.finish()
    await screen.findByRole('treeitem', {name: 'added.ts'})
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
    expect(folder).toHaveAttribute('aria-expanded', 'false')
  })
  it('should abort an old workspace stream and preserve only the new workspace results', async () => {
    const {port, stream} = setup()
    const [current, setCurrent] = createSignal(session)
    const initial = stream()
    render(() => <SFileTree port={port} session={current()} visible />)
    const first = await initial
    first.send(rootBatch)
    await screen.findByRole('treeitem', {name: 'src'})
    const replacement = stream()
    setCurrent({session: 'second', workspace: '/other'})
    const second = await replacement
    expect(first.signal.aborted).toBe(true)
    second.send({...rootBatch, directories: [], files: [{openable: true, path: 'current.ts'}]})
    second.finish()
    await screen.findByRole('treeitem', {name: 'current.ts'})
    expect(screen.queryByRole('treeitem', {name: 'src'})).toBeNull()
    await waitFor(() => expect(first.cancelled).toHaveBeenCalledOnce())
  })
  it('should remove deleted cached descendants after their visible parent refreshes', async () => {
    const {port, stream} = setup()
    const initial = stream()
    render(() => (
      <SFileTree
        port={port}
        session={{
          ...session,
          document: {
            lines: [],
            location: {column: 1, line: 1, path: 'src/main.ts'},
            revision: 'revision',
            source: '',
          },
        }}
        visible
      />
    ))
    const first = await initial
    first.send(rootBatch)
    first.send(sourceBatch)
    first.finish()
    await screen.findByRole('treeitem', {name: 'main.ts'})
    await waitFor(() => expect(screen.getByRole('tree')).toHaveAttribute('aria-busy', 'false'))
    const refresh = stream()
    fireEvent.click(screen.getByRole('button', {name: '파일 트리 새로고침'}))
    const second = await refresh
    second.send({...rootBatch, directories: []})
    second.finish()
    await waitFor(() => expect(screen.queryByRole('treeitem', {name: 'src'})).toBeNull())
    expect(screen.queryByRole('treeitem', {name: 'main.ts'})).toBeNull()
  })
})
