import {batch, createMemo, createSignal} from 'solid-js'
import {
  createModelState,
  getModelView,
  type ModelAction,
  type ModelBinding,
  type ModelChange,
  type ModelCommandResult,
  reduceModel,
} from '@winter-love/puppet/editor'
import type {PuppetDocument} from '@winter-love/puppet/player'

export interface CreateModelSessionOptions {
  /** Identity of the shared model; retained while changing pages. */
  readonly sessionId: string
  /** Validated initial model restored by Poffo. */
  readonly document: PuppetDocument
  /** Receives completed snapshots for serialized recovery persistence; never called for previews or rollback. */
  readonly onCommit?: (document: PuppetDocument, change: ModelChange) => void
}

/** Owns the single mutable document/history state used by Editor, Studio and Viewer. */
export const createModelSession = (options: CreateModelSessionOptions): ModelBinding => {
  const [state, setState] = createSignal(createModelState(options))
  const [change, setChange] = createSignal<ModelChange | null>(null)
  const document = createMemo(() => state().document)
  const revision = createMemo(() => state().revision)
  const read = createMemo(() => getModelView(state(), change()))
  const request = (action: ModelAction): ModelCommandResult => {
    const result = reduceModel(state(), action)
    if (!result.ok) {
      return result
    }
    batch(() => {
      setState(result.state)
      if (result.change !== null) {
        setChange(result.change)
      }
      if (result.change?.phase === 'commit' && result.change.kind !== 'reset') {
        options.onCommit?.(result.state.document, result.change)
      }
    })
    return {changed: result.change !== null, ok: true, revision: result.state.revision}
  }
  return {document, read, request, revision}
}
