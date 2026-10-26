import {batch, createEffect, createSignal, onCleanup} from 'solid-js'
import type {
  EditorAccepted,
  EditorCancelled,
  EditorCommandResult,
  EditorController,
  EditorLifecycle,
  EditorMode,
  EditorModeCompleted,
  EditorRejected,
  EditorState,
} from './control'
import type {ModelBinding, ModelMove, ModelOrigin} from './model'
import type {EditorPanelPosition} from './use-panel-layout'

export interface CreateEditorControlOptions {
  /** Initial input activation; omitted for active input. */
  readonly initiallyActive?: boolean
  /** Unmounts the editor's owned reactive root; omitted when the caller owns root disposal directly. */
  readonly onDispose?: () => void
  /** Borrowed host document; disposing this editor only releases its owner. */
  readonly model: ModelBinding
  /** Unique editor instance identity, never reused after disposal. */
  readonly ownerId: string
  /** Local editor view state, without a document or history store. */
  readonly read: () => Omit<
    EditorState,
    'lifecycle' | 'canUndo' | 'canRedo' | 'undoCount' | 'redoCount' | 'sessionId' | 'revision'
  >
  /** Schedules the existing deferred mode transition. */
  readonly selectMode: (mode: EditorMode) => void
  /** Cancels the existing pending local selection/mode transition. */
  readonly resetSelection: () => void
  /** Applies one local panel visibility change. */
  readonly setPanelOpen: (panel: EditorPanelPosition, open: boolean) => void
  /** Stops playback and unfinished editor-local work on deactivation or disposal. */
  readonly stop: () => void
}

interface PendingMode {
  readonly id: string
  readonly mode: EditorMode
  readonly resolve: (result: EditorModeCompleted | EditorCancelled) => void
}

const settleMode = (current: PendingMode, local: Pick<EditorState, 'appliedMode'>): void => {
  current.resolve(
    local.appliedMode === current.mode
      ? {status: 'completed', value: current.mode}
      : {reason: 'superseded', status: 'cancelled'},
  )
}

const moveHistory = (options: CreateEditorControlOptions, action: ModelMove) => {
  const result = options.model.request(action)
  if (result.ok && result.changed) {
    options.stop()
  }
  return result
}

export const createEditorControl = (options: CreateEditorControlOptions): EditorController => {
  const [phase, setPhase] = createSignal<EditorLifecycle>(
    options.initiallyActive === false ? 'inactive' : 'active',
  )
  const [pending, setPending] = createSignal<PendingMode | null>(null)
  let sequence = 0
  const origin = (): ModelOrigin => {
    sequence += 1
    return {ownerId: options.ownerId, requestId: `${options.ownerId}:control:${sequence}`}
  }
  const rejection = (): EditorRejected | null => {
    const current = phase()
    if (current === 'disposed') {
      return {reason: 'stale-instance', status: 'rejected'}
    }
    return current === 'active' ? null : {reason: 'inactive', status: 'rejected'}
  }
  const cancelMode = (reason: EditorCancelled['reason']) => {
    const current = pending()
    if (current !== null) {
      setPending(null)
      options.resetSelection()
      current.resolve({reason, status: 'cancelled'})
    }
  }
  const transition = (next: EditorLifecycle): EditorCommandResult => {
    if (phase() === 'disposed') {
      return {reason: 'stale-instance', status: 'rejected'}
    }
    if (phase() === next) {
      return {changed: false, status: 'completed'}
    }
    if (next === 'suspended' && phase() === 'inactive') {
      return {reason: 'inactive', status: 'rejected'}
    }
    if (next !== 'active' && options.model.read().transaction !== null) {
      return {reason: 'busy', status: 'rejected'}
    }
    if (next !== 'active') {
      cancelMode('inactive')
      options.stop()
    }
    setPhase(next)
    return {changed: true, status: 'completed'}
  }
  const dispose = () => {
    if (phase() !== 'disposed') {
      setPhase('disposed')
      cancelMode('disposed')
      options.stop()
      options.model.request({...origin(), type: 'release'})
      options.onDispose?.()
    }
  }
  onCleanup(dispose)
  createEffect(() => {
    const current = pending()
    const local = options.read()
    if (current !== null && !local.modePending) {
      setPending(null)
      settleMode(current, local)
    }
  })
  const selectMode = (mode: EditorMode): EditorAccepted | EditorRejected => {
    const rejected = rejection()
    if (rejected !== null) {
      return rejected
    }
    if (options.model.read().transaction !== null) {
      return {reason: 'busy', status: 'rejected'}
    }
    cancelMode('superseded')
    const id = origin().requestId
    const finished = new Promise<EditorModeCompleted | EditorCancelled>((resolve) => {
      batch(() => {
        options.selectMode(mode)
        setPending({id, mode, resolve})
      })
    })
    return {
      operation: {
        cancel: () => {
          if (pending()?.id === id) {
            cancelMode('cancelled')
          }
        },
        finished,
        id,
      },
      status: 'accepted',
    }
  }
  const setPanelOpen = (panel: EditorPanelPosition, open: boolean): EditorCommandResult => {
    const rejected = rejection()
    if (rejected !== null) {
      return rejected
    }
    const changed = options.read().panels[panel] !== open
    options.setPanelOpen(panel, open)
    return {changed, status: 'completed'}
  }
  return {
    commands: {
      redo: () => rejection() ?? moveHistory(options, {...origin(), type: 'redo'}),
      replaceDocument: (document, expected) =>
        rejection() ??
        options.model.request({
          ...origin(),
          document,
          expectedRevision: expected?.revision ?? options.model.revision(),
          expectedSessionId: expected?.sessionId,
          type: 'replace',
        }),
      selectMode,
      setPanelOpen,
      togglePanel: (panel) => setPanelOpen(panel, !options.read().panels[panel]),
      undo: () => rejection() ?? moveHistory(options, {...origin(), type: 'undo'}),
    },
    getState: () => {
      const model = options.model.read()
      return {
        ...options.read(),
        canRedo: model.transaction === null && model.redoCount > 0,
        canUndo: model.transaction === null && model.undoCount > 0,
        lifecycle: phase(),
        redoCount: model.redoCount,
        revision: model.revision,
        sessionId: model.sessionId,
        undoCount: model.undoCount,
      }
    },
    lifecycle: {
      activate: () => transition('active'),
      deactivate: () => transition('inactive'),
      dispose,
      resume: () => transition('active'),
      suspend: () => transition('suspended'),
    },
  }
}
