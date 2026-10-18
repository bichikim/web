import {createSignal, For} from 'solid-js'
import type {ScanBatch, WorkspaceSession} from '../../src/shared/contracts'
import {SFileTree} from '../../src/viewer/SFileTree'
import type {ViewerPort} from '../../src/viewer/types'
import {nextAnimationFrame} from '../../src/viewer/next-animation-frame'

const BATCH_SIZE = 256
const SHUFFLE_STRIDE = 7919
// oxlint-disable-next-line no-magic-numbers -- These are benchmark dataset sizes.
const SIZES = [1000, 5000, 10000, 20000, 50000, 100000]

interface Measurement {
  readonly count: number
  readonly batches: number
  readonly clientMs: number
  readonly firstRowsMs: number | null
  readonly worstBatchMs: number
  readonly mountedRows: number
}

const waitForIdle = (element: HTMLDivElement | undefined): Promise<void> => {
  const tree = element?.querySelector('[role="tree"]')
  if (tree === null || tree === undefined || tree.getAttribute('aria-busy') !== 'true') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (tree.getAttribute('aria-busy') !== 'true') {
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(tree, {attributeFilter: ['aria-busy'], attributes: true})
  })
}

export const SFileTreeBenchmark = () => {
  const [session, setSession] = createSignal<WorkspaceSession>()
  const [results, setResults] = createSignal<Measurement[]>([])
  const [running, setRunning] = createSignal(false)
  const [status, setStatus] = createSignal('Ready')
  let element: HTMLDivElement | undefined
  let count = 0
  let cursor = 0
  let batches = 0
  let started = 0
  let previous = 0
  let worst = 0
  let firstRows: number | null = null
  let complete: (() => void) | undefined
  const handleElement = (value: HTMLDivElement): void => {
    element = value
  }
  const rows = (): number => element?.querySelectorAll('[role="treeitem"]').length ?? 0
  const port: ViewerPort = {
    call: async (name) => {
      if (name === 'code.tree') {
        cursor = 0
        return {content: [], structuredContent: {url: 'code-viewer://scan/benchmark'}}
      }
      if (name === 'code.stream.read') {
        const now = Date.now()
        if (cursor > 0) {
          worst = Math.max(worst, now - previous)
          if (firstRows === null && rows() > 0) {
            firstRows = now - started
          }
        }
        previous = now
        if (cursor >= count) {
          complete?.()
          return {content: [], structuredContent: {done: true}}
        }
        const end = Math.min(count, cursor + BATCH_SIZE)
        const batch: ScanBatch = {
          complete: end === count,
          directories: [],
          directory: '',
          files: Array.from({length: end - cursor}, (_, index) => ({
            openable: true,
            path: `file-${((cursor + index) * SHUFFLE_STRIDE) % count}.ts`,
          })),
          ...(end === count ? {version: 'complete'} : {}),
        }
        cursor = end
        batches += 1
        return {content: [], structuredContent: {batch, done: false}}
      }
      return {content: [], structuredContent: {}}
    },
    context: async () => undefined,
    start: async () => () => undefined,
  }
  const handleRun = async (): Promise<void> => {
    setRunning(true)
    setResults([])
    for (const size of SIZES) {
      count = size
      batches = 0
      worst = 0
      firstRows = null
      setStatus(`Loading ${size.toLocaleString()} files`)
      const finished = Promise.withResolvers<void>()
      complete = finished.resolve
      started = Date.now()
      setSession({session: `benchmark-${size}-${started}`, workspace: '/benchmark'})
      // oxlint-disable-next-line no-await-in-loop -- Measure each mounted workspace independently.
      await finished.promise
      // oxlint-disable-next-line no-await-in-loop -- Include the final tree commit and request completion in the measurement.
      await waitForIdle(element)
      const clientMs = Date.now() - started
      worst = Math.max(worst, Date.now() - previous)
      // oxlint-disable-next-line no-await-in-loop -- Wait for the browser frame before inspecting rendered rows.
      await nextAnimationFrame(new AbortController().signal)
      const measurement = {
        batches,
        clientMs,
        count,
        firstRowsMs: firstRows,
        mountedRows: rows(),
        worstBatchMs: worst,
      }
      setResults((values) => [...values, measurement])
    }
    setStatus('Complete')
    setRunning(false)
  }
  return (
    <main class="mx-auto max-w-5xl p-6 font-sans text-foreground">
      <h1 class="text-xl font-semibold">File tree performance</h1>
      <p>
        Production tree, shuffled names, 256 files per MCP batch, immediate transport responses.
      </p>
      <button class="ui-button" disabled={running()} onClick={handleRun} type="button">
        Run render benchmark
      </button>
      <p role="status">{status()}</p>
      <div
        class="h-[400px] max-w-xl overflow-hidden border border-solid border-border rounded-lg"
        ref={handleElement}
      >
        <SFileTree port={port} session={session()} visible />
      </div>
      <table class="my-4 w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th>Files</th>
            <th>Complete (ms)</th>
            <th>First rows (ms)</th>
            <th>Read gap (ms)</th>
            <th>DOM rows</th>
          </tr>
        </thead>
        <tbody>
          <For each={results()}>
            {(result) => (
              <tr class="border-b border-solid border-border">
                <td class="py-2">{result.count.toLocaleString()}</td>
                <td>{result.clientMs}</td>
                <td>{result.firstRowsMs}</td>
                <td>{result.worstBatchMs}</td>
                <td>{result.mountedRows}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <details>
        <summary>JSON results</summary>
        <pre aria-label="Benchmark results" class="overflow-auto rounded-lg bg-surface p-4 text-xs">
          {JSON.stringify(results(), null, 2)}
        </pre>
      </details>
    </main>
  )
}
