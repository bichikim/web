import {batch, createMemo, createSignal, onCleanup} from 'solid-js'
import jsonPatch from 'fast-json-patch'
const {compare} = jsonPatch
import {
  createModelState,
  getModelView,
  reduceModel,
  type ModelAction,
  type ModelBinding,
  type ModelCommandResult,
  type ModelView,
} from '@winter-love/puppet/model'
import {applyModelEvent, type ModelEvent} from '../model-events'
import {modelResultSchema} from '../protocol'
import type {CommandResponse} from '../create-command-service'

export interface RemoteModelSessionOptions {
  /** Initial authoritative view delivered by the authenticated event stream. */
  readonly initial: ModelView
  /** Executes an action and returns its authoritative result and event sequence. */
  readonly send: (
    operation: string,
    input: unknown,
  ) => Promise<CommandResponse & {sequence?: number}>
}

interface PendingAction {
  readonly action: ModelAction
  readonly before: ModelView
  readonly resolve: (result: ModelCommandResult) => void
}

const rejected = (code: 'inactive' | 'stale-revision'): ModelCommandResult => ({
  error: {code},
  ok: false,
})

/** Keeps a view/provisional edit projection; document history remains authoritative on the remote host. */
export const createRemoteModelSession = (options: RemoteModelSessionOptions) => {
  let confirmed = options.initial
  let streamed = options.initial
  let streamSequence = 0
  let targetSequence = 0
  let disposed = false
  let running = false
  let active: PendingAction | null = null
  let disconnected = false
  let blocked = false
  const pending: PendingAction[] = []
  const projected: ModelAction[] = []
  const [view, setView] = createSignal(confirmed)
  const [failure, setFailure] = createSignal<string | null>(null)
  const document = createMemo(() => view().document)
  const revision = createMemo(() => view().revision)
  const project = () => {
    let state = {
      ...createModelState({document: confirmed.document, sessionId: confirmed.sessionId}),
      revision: confirmed.revision,
    }
    if (confirmed.transaction !== null) {
      state = {...state, transaction: {...confirmed.transaction, document: confirmed.document}}
    }
    for (const action of projected) {
      if (action.type !== 'undo' && action.type !== 'redo' && action.type !== 'go-to') {
        const result = reduceModel(state, action)
        if (result.ok) {
          state = result.state
        }
      }
    }
    const projection = getModelView(state, confirmed.change)
    setView({
      ...confirmed,
      document: projection.document,
      revision: projection.revision,
      transaction: projection.transaction,
    })
  }
  const synchronize = () => {
    if (!running && pending.length === 0 && streamSequence >= targetSequence) {
      confirmed = streamed
      projected.length = 0
      blocked = false
      setView(confirmed)
    }
  }
  const fail = (message: string, transport = false) => {
    disconnected ||= transport
    active?.resolve(rejected('inactive'))
    active = null
    setFailure(message)
    blocked = true
    projected.length = 0
    confirmed = streamed
    setView(streamed)
    for (const item of pending.splice(0)) {
      item.resolve(rejected('inactive'))
    }
  }
  const drain = async () => {
    if (running) {
      return
    }
    running = true
    try {
      while (pending.length > 0) {
        const current = pending.shift()!
        active = current
        const {action} = current
        const write = action.type === 'edit' || action.type === 'replace'
        const input = write
          ? {
              ...action,
              document: undefined,
              patch: compare(current.before.document, action.document),
            }
          : {...action, expectedRevision: current.before.revision}
        // Each response confirms one mutation; ordered submission preserves gesture transactions.
        // eslint-disable-next-line no-await-in-loop
        const response = await options.send(write ? 'model.patch' : 'model.request', input)
        targetSequence = Math.max(targetSequence, response.sequence ?? 0)
        const result = response.ok
          ? modelResultSchema.parse(response.value)
          : (modelResultSchema.safeParse({error: response.error, ok: false}).data ??
            rejected('inactive'))
        current.resolve(result)
        active = null
        if (!result.ok) {
          fail(response.ok ? result.error.code : response.error.message)
          break
        }
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Connection failed', true)
    } finally {
      running = false
      synchronize()
    }
  }
  const binding: ModelBinding = {
    document,
    read: view,
    request: (action) => {
      if (disposed || blocked || disconnected) {
        return Promise.resolve(rejected('inactive'))
      }
      const before = view()
      projected.push(action)
      batch(project)
      return new Promise<ModelCommandResult>((resolve) => {
        pending.push({action, before, resolve})
        drain()
      })
    },
    revision,
  }
  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    fail('Connection closed')
  }
  onCleanup(dispose)
  return {
    binding,
    disconnect: (message: string) => fail(message, true),
    dismissFailure: () => setFailure(null),
    dispose,
    failure,
    receive: (event: ModelEvent) => {
      if (event.sequence < streamSequence) {
        return
      }
      streamed = applyModelEvent(streamed, event)
      streamSequence = event.sequence
      synchronize()
    },
  }
}
