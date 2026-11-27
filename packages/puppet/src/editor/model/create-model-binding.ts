import {createSignal} from 'solid-js'
import {createModelState, type CreateModelStateOptions} from './create-model-state'
import {getModelView} from './get-model-view'
import {reduceModel} from './reduce-model'
import type {ModelAction, ModelApplied, ModelBinding, ModelCommandResult} from './types'

export interface CreateModelBindingOptions extends CreateModelStateOptions {
  /** If supplied, receives each applied change after snapshot updates and before Solid publication. */
  readonly onApply?: (result: ModelApplied) => void
}

/** Creates a host-owned model with synchronous reads and batched Solid notifications. */
export const createModelBinding = (options: CreateModelBindingOptions): ModelBinding => {
  let state = createModelState(options)
  let view = getModelView(state, null)
  const [trackedDocument, trackDocument] = createSignal(view.document)
  const [trackedRevision, trackRevision] = createSignal(view.revision)
  const [trackedView, trackView] = createSignal(view)

  // Commands and host callbacks read the latest snapshot even before Solid flushes its signals.
  const document = () => {
    trackedDocument()
    return view.document
  }
  const revision = () => {
    trackedRevision()
    return view.revision
  }
  const read = () => {
    trackedView()
    return view
  }
  const request = (action: ModelAction): ModelCommandResult => {
    const result = reduceModel(state, action)
    if (!result.ok) {
      return result
    }
    const {state: nextState, change} = result
    if (state !== nextState || change !== null) {
      state = nextState
      view = getModelView(state, change ?? view.change)
      trackDocument(view.document)
      trackRevision(view.revision)
      trackView(view)
    }
    if (change !== null) {
      options.onApply?.(result)
    }
    return {changed: change !== null, ok: true, revision: nextState.revision}
  }
  return {document, read, request, revision}
}
