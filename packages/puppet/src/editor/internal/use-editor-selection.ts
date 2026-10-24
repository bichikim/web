import {getDocumentParameterBindings} from './parameter-keyforms'
import {type Accessor, createEffect, on, untrack} from 'solid-js'
import type {PuppetDocument} from '../../player'
import {getSceneNode, type SceneSelection} from './scene-graph'
import {useDeferredValue} from '../../use-deferred-value'

export interface EditorSelectionIntent {
  readonly bindingId: string | null
  readonly layers: SceneSelection
  readonly workspace: 'animation' | 'modeling'
}
interface EditorSelectionOptions {
  /** Current prepared selection; read again when a synchronous edit cancels preparation. */
  readonly current: Accessor<EditorSelectionIntent>
  /** Current source document, used to invalidate targets removed during preparation. */
  readonly document: Accessor<PuppetDocument>
  /** Applies the latest combined intent after immediate feedback has had a paint opportunity. */
  readonly onCommit: (selection: EditorSelectionIntent) => void
}

export const useEditorSelection = (options: EditorSelectionOptions) => {
  const state = useDeferredValue({
    initialValue: untrack(options.current),
    onCommit: (selection) => options.onCommit(selection),
  })
  const reset = () => state.reset(options.current())
  createEffect(
    on([options.document, options.current], ([document], previous) => {
      const targetRemoved =
        document !== previous?.[0] &&
        (state.value().layers.nodeIds.some((id) => getSceneNode(document, id) === undefined) ||
          (state.value().bindingId !== null &&
            !getDocumentParameterBindings(document).some(
              (binding) => binding.id === state.value().bindingId,
            )))
      if (!state.pending() || targetRemoved) {
        reset()
      }
    }),
  )
  const select = (next: EditorSelectionIntent) => {
    const current = options.current()
    const sameLayers =
      next.layers.activeNodeId === current.layers.activeNodeId &&
      next.layers.nodeIds.length === current.layers.nodeIds.length &&
      next.layers.nodeIds.every((id, index) => id === current.layers.nodeIds[index])
    if (
      sameLayers &&
      next.workspace === current.workspace &&
      (next.bindingId === null || next.bindingId === current.bindingId)
    ) {
      state.reset(current)
    } else {
      state.select(next)
    }
  }
  const selectLayer = (layers: SceneSelection) =>
    select({...state.value(), bindingId: null, layers})
  const selectBinding = (bindingId: string) => select({...state.value(), bindingId})
  const selectWorkspace = (workspace: EditorSelectionIntent['workspace']) =>
    select({...state.value(), bindingId: null, workspace})
  const panelPending = () => {
    const current = options.current()
    return (
      state.pending() &&
      (state.value().layers !== current.layers || state.value().workspace !== current.workspace)
    )
  }
  return {
    bindingId: () => state.value().bindingId,
    layers: () => state.value().layers,
    panelPending,
    pending: state.pending,
    reset,
    selectBinding,
    selectLayer,
    selectWorkspace,
    workspace: () => state.value().workspace,
  }
}
