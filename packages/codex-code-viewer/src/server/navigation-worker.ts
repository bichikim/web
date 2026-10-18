import {once} from 'node:events'
import {type MessagePort, parentPort, workerData} from 'node:worker_threads'
import {z} from 'zod'
import {navigationInputSchema, treeSchema} from '../shared/contracts'
import {createWorkspace} from './create-workspace'
import {streamNavigation} from './stream-navigation'

const port = parentPort
if (port === null) {
  throw new Error('Navigation requires a worker thread')
}
const workspace = createWorkspace(z.string().parse(workerData), {worker: true})
interface WorkerRequest {
  readonly discovery?: unknown
  readonly kind?: 'definition' | 'references'
  readonly input?: unknown
  readonly warmup?: unknown
  readonly channel: MessagePort
  readonly review: unknown
  readonly cancellation: SharedArrayBuffer
}
interface WorkerLookupOptions {
  readonly cancelled: () => boolean
  readonly channel: MessagePort
  readonly input: import('../shared/contracts').NavigationInput
  readonly kind: 'definition' | 'references'
  readonly signal: AbortSignal
}
const sendSymbolLookup = async ({
  cancelled,
  channel,
  input,
  kind,
  signal,
}: WorkerLookupOptions): Promise<void> => {
  const lookup = {cancelled, signal}
  const result =
    kind === 'definition'
      ? await workspace.definitions(input.path, input.offset, input.sources, lookup)
      : await workspace.references(input.path, input.offset, input.sources, lookup)
  if (!result.ok) {
    throw new Error(result.error.code)
  }
  if (!cancelled()) {
    const consumed = once(channel, 'message', {signal})
    channel.postMessage({batch: {kind, locations: result.value}})
    await consumed
    channel.postMessage({done: true, inputs: [...workspace.resolutionInputs()]})
  }
}
const prepareWorkspace = (warmup: unknown, discovery: unknown): Promise<boolean> => {
  if (discovery !== undefined) {
    workspace.seedNavigation?.(treeSchema.parse(discovery))
  }
  return warmup === true
    ? workspace.prepareWorkspace()
    : workspace.warmNavigation(z.string().parse(warmup))
}
const readScope = (review: unknown) => {
  const scope = z
    .object({
      candidates: z.array(z.string()).optional(),
      discovery: treeSchema.optional(),
      files: z.array(z.string()).optional(),
      retained: z.array(z.string()).optional(),
    })
    .parse(review ?? {})
  if (scope.discovery !== undefined) {
    workspace.seedNavigation?.(scope.discovery)
  }
  return scope
}

const run = async ({
  input,
  kind,
  discovery,
  warmup,
  channel,
  review,
  cancellation,
}: WorkerRequest): Promise<void> => {
  const state = new Int32Array(cancellation)
  const cancelled = (): boolean => Atomics.load(state, 0) !== 0
  const controller = new AbortController()
  const stop = (): void => controller.abort()
  const release = warmup === undefined ? workspace.prioritizeNavigation?.() : undefined
  channel.on('close', stop)
  channel.on('message', (message) => {
    if (message.cancelled === true) {
      stop()
    }
  })
  try {
    if (cancelled()) {
      return
    }
    if (warmup !== undefined) {
      const prepared = await prepareWorkspace(warmup, discovery)
      if (!prepared) {
        throw new Error('Navigation preparation unavailable')
      }
      if (!cancelled()) {
        channel.postMessage({done: true, inputs: [...workspace.resolutionInputs()]})
      }
      return
    }
    const request = navigationInputSchema.parse(input)
    const scope = readScope(review)
    if (kind !== undefined) {
      await sendSymbolLookup({cancelled, channel, input: request, kind, signal: controller.signal})
      return
    }
    const document = workspace.read(request.path)
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    if (document.value.revision !== request.revision) {
      throw new Error('stale-document')
    }
    for await (const batch of streamNavigation({
      ...request,
      document: document.value,
      signal: controller.signal,
      workspace: {
        ...workspace,
        definitions: (path, offset, sources, progress) =>
          workspace.definitions(path, offset, sources, {
            ...(typeof progress === 'function' ? {} : progress),
            cancelled,
          }),
        references: (path, offset, sources, progress) =>
          workspace.references(path, offset, sources, {...scope, ...progress, cancelled}),
      },
    })) {
      if (cancelled()) {
        return
      }
      const consumed = once(channel, 'message', {signal: controller.signal})
      channel.postMessage({batch})
      await consumed
    }
    if (!cancelled()) {
      channel.postMessage({done: true, inputs: [...workspace.resolutionInputs()]})
    }
  } catch (error) {
    if (!cancelled()) {
      channel.postMessage({error: error instanceof Error ? error.message : 'read-failed'})
    }
  } finally {
    release?.()
    channel.close()
  }
}
let pending = Promise.resolve()
port.on('message', (request: WorkerRequest | {readonly shutdown: true}) => {
  if ('shutdown' in request) {
    workspace.dispose()
    port.close()
  } else if (request.warmup === undefined) {
    pending = pending.then(() => run(request))
  } else {
    run(request)
  }
})
