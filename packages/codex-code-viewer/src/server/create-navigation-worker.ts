import {on} from 'node:events'
import {MessageChannel, type MessagePort, Worker} from 'node:worker_threads'
import {z} from 'zod'
import {readChangedPaths} from './navigation-cache/read-changed-paths'
import {readInputRevisions} from './native/read-input-revisions'
import type {NavigationReview} from './navigation-cache'
import {
  type NavigationInput,
  type NavigationKind,
  type NavigationResult,
  navigationResultSchema,
  type WorkspaceTree,
} from '../shared/contracts'

const messageSchema = z.union([
  z.object({batch: navigationResultSchema}),
  z.object({done: z.literal(true), inputs: z.array(z.tuple([z.string(), z.string()])).optional()}),
  z.object({error: z.string()}),
])

interface ScanRequest {
  readonly kind?: NavigationKind
  readonly input: NavigationInput
  readonly review: NavigationReview
}
interface WarmupRequest {
  readonly discovery?: WorkspaceTree
  readonly warmup: string | true
}
interface PendingWarmup {
  readonly project: string
  readonly controller: AbortController
  readonly promise: Promise<boolean>
}

const createNavigationThread = (root: string, failed: (thread: Worker) => void): Worker => {
  const thread = new Worker(
    new URL(
      import.meta.url.endsWith('.ts') ? './navigation/bootstrap.ts' : './navigation-worker.js',
      import.meta.url,
    ),
    {workerData: root},
  )
  thread.once('error', () => failed(thread))
  thread.unref()
  return thread
}

const closeNavigationThread = (thread: Worker | null): void => {
  thread?.ref()
  // Keep startup cleanup observable even when the workspace disappeared before boot completed.
  thread?.once('error', () => undefined)
  thread?.postMessage({shutdown: true})
}

/** Retains project analysis; onStarted runs after dispatch and is not awaited. */
export const createNavigationWorker = (
  root: string,
  _project: (path: string) => string = (path) => path,
  onStarted?: () => void,
) => {
  let inputs: ReadonlyMap<string, string> = new Map()
  let worker: Worker | null = null
  let active: AbortController | null = null
  let warming: PendingWarmup | null = null
  const ports = new Map<MessagePort, Worker>()
  const waiting = new Set<symbol>()
  const start = (): Worker => {
    worker ??= createNavigationThread(root, (thread) => {
      if (worker === thread) {
        worker = null
      }
    })
    return worker
  }
  async function* exchange(
    request: ScanRequest | WarmupRequest,
    signal: AbortSignal,
  ): AsyncGenerator<NavigationResult> {
    signal.throwIfAborted()
    const thread = start()
    thread.ref()
    const {port1, port2} = new MessageChannel()
    ports.set(port1, thread)
    const cancellation = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)
    const stop = (): void => {
      Atomics.store(new Int32Array(cancellation), 0, 1)
      port1.postMessage({cancelled: true})
      port1.close()
    }
    const fail = (error: Error): void => {
      if (worker === thread) {
        worker = null
      }
      port1.emit('error', error)
    }
    const exit = (): void => fail(new Error('Navigation worker exited before completion'))
    signal.addEventListener('abort', stop, {once: true})
    thread.once('error', fail)
    thread.once('exit', exit)
    const messages = on(port1, 'message', {signal})
    thread.postMessage({...request, cancellation, channel: port2}, [port2])
    let complete = false
    try {
      onStarted?.()
      for await (const [value] of messages) {
        const message = messageSchema.parse(value)
        if ('error' in message) {
          throw new Error(message.error)
        }
        if ('done' in message) {
          inputs = new Map(message.inputs)
          complete = true
          return
        }
        yield message.batch
        signal.throwIfAborted()
        port1.postMessage({consumed: true})
      }
    } finally {
      signal.removeEventListener('abort', stop)
      thread.removeListener('error', fail)
      thread.removeListener('exit', exit)
      port1.close()
      await messages.return?.()
      if (!complete) {
        stop()
      }
      ports.delete(port1)
      if (![...ports.values()].includes(thread)) {
        thread.unref()
      }
    }
  }
  return {
    busy: (): boolean => active !== null || waiting.size > 0,
    changed: async (signal: AbortSignal): Promise<boolean> =>
      (await readChangedPaths(inputs, signal, readInputRevisions)).length > 0,
    dispose: (): void => {
      inputs = new Map()
      active?.abort()
      warming?.controller.abort()
      warming = null
      const previous = worker
      worker = null
      closeNavigationThread(previous)
    },
    inputs: (): ReadonlyMap<string, string> => inputs,
    prioritize: (): (() => void) => {
      const owner = Symbol()
      waiting.add(owner)
      return waiting.delete.bind(waiting, owner)
    },
    scan: async function* (
      input: NavigationInput,
      signal: AbortSignal,
      review: NavigationReview = {},
      kind?: NavigationKind,
    ): AsyncGenerator<NavigationResult> {
      active?.abort()
      const controller = new AbortController()
      active = controller
      const combined = AbortSignal.any([signal, controller.signal])
      try {
        combined.throwIfAborted()
        // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
        yield* exchange({input, kind, review}, combined)
      } finally {
        if (active === controller) {
          active = null
        }
      }
    },
    start: (): void => {
      start()
    },
    /** Resolves false when preparation is interrupted or unavailable; navigation remains available. */
    warm: (path?: string, discovery?: WorkspaceTree): Promise<boolean> => {
      const key = root
      if (warming?.project === key) {
        return warming.promise
      }
      if (active !== null || waiting.size > 0) {
        return Promise.resolve(false)
      }
      warming?.controller.abort()
      const controller = new AbortController()
      const promise = (async (): Promise<boolean> => {
        try {
          for await (const _batch of exchange(
            {discovery, warmup: path ?? true},
            controller.signal,
          )) {
            // Preparation emits completion without navigation results.
          }
          return true
        } catch {
          return false
        } finally {
          if (warming?.controller === controller) {
            warming = null
          }
        }
      })()
      warming = {controller, project: key, promise}
      return promise
    },
  }
}
