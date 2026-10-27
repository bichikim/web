import {batch, createMemo, createSignal} from 'solid-js'
import {
  createModelState,
  getModelView,
  type ModelAction,
  type ModelApplied,
  type ModelBinding,
  type ModelChange,
  type ModelCommandResult,
  reduceModel,
} from '../editor/model'

import type {PuppetDocument} from '../player'

export interface CreateElementModelOptions {
  /** Unique identity for this connection's standalone host session. */
  readonly sessionId: string
  /** Maximum undo steps; omitted to retain 100 steps. */
  readonly limit?: number
  /** Detached, validated document; the adapter owns its history until disconnect. */
  readonly document: PuppetDocument
  /** Publishes an applied change inside the same batch, before reactive state notifications. */
  readonly onApply?: (result: ModelApplied) => void
}

/** Standalone DOM host adapter. It never imports or shares Poffo's mutable session. */
export const createElementModel = (options: CreateElementModelOptions): ModelBinding => {
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
      if (result.change !== null) {
        options.onApply?.(result)
      }
    })
    return {changed: result.change !== null, ok: true, revision: result.state.revision}
  }
  return {document, read, request, revision}
}
