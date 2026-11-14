import type {PlayerCanvasStatus} from './PlayerCanvas'
import type {EditorPanelPosition} from './use-panel-layout'
import type {ModelCommandResult, ModelVersion} from './model'
import type {PuppetDocument} from '../player'

export type EditorMode = 'animation' | 'modeling'
export type EditorLifecycle = 'inactive' | 'active' | 'suspended' | 'disposed'

export interface EditorState {
  readonly sessionId: string
  readonly revision: number
  readonly lifecycle: EditorLifecycle
  readonly mode: EditorMode
  readonly appliedMode: EditorMode
  readonly modePending: boolean
  readonly panels: Readonly<Record<EditorPanelPosition, boolean>>
  readonly renderer: PlayerCanvasStatus
  readonly hasTemporaryChanges: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly undoCount: number
  readonly redoCount: number
}

export interface EditorRejected {
  readonly status: 'rejected'
  readonly reason: 'busy' | 'inactive' | 'stale-instance'
}

export interface EditorCompleted {
  readonly status: 'completed'
  readonly changed: boolean
}

export type EditorCommandResult = EditorCompleted | EditorRejected

export interface EditorModeCompleted {
  readonly status: 'completed'
  readonly value: EditorMode
}

export interface EditorCancelled {
  readonly status: 'cancelled'
  readonly reason: 'cancelled' | 'superseded' | 'disposed' | 'inactive'
}

export interface EditorOperation {
  readonly id: string
  readonly finished: Promise<EditorModeCompleted | EditorCancelled>
  readonly cancel: () => void
}

export interface EditorAccepted {
  readonly status: 'accepted'
  readonly operation: EditorOperation
}

export interface EditorController {
  readonly getState: () => EditorState
  readonly commands: {
    readonly selectMode: (mode: EditorMode) => EditorAccepted | EditorRejected
    readonly setPanelOpen: (panel: EditorPanelPosition, open: boolean) => EditorCommandResult
    readonly togglePanel: (panel: EditorPanelPosition) => EditorCommandResult
    readonly undo: () => ModelCommandResult | EditorRejected
    readonly redo: () => ModelCommandResult | EditorRejected
    /** Use a captured version after asynchronous preparation; omitted to apply against the current binding. */
    readonly replaceDocument: (
      document: PuppetDocument,
      expected?: ModelVersion,
    ) => ModelCommandResult | EditorRejected
  }
  readonly lifecycle: {
    readonly activate: () => EditorCommandResult
    readonly deactivate: () => EditorCommandResult
    readonly suspend: () => EditorCommandResult
    readonly resume: () => EditorCommandResult
    readonly dispose: () => void
  }
}
