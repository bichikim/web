import type {PuppetDocument} from '../../player/document'

export type ModelHistoryKind = 'edit' | 'replace'

export interface ModelVersion {
  readonly sessionId: string
  readonly revision: number
}

export interface ModelSnapshot {
  readonly id: number
  readonly document: PuppetDocument
  readonly title: string
  readonly kind: ModelHistoryKind
}

export interface ModelPendingTransaction {
  readonly id: string
  readonly ownerId: string
}

export interface ModelTransaction extends ModelPendingTransaction {
  readonly document: PuppetDocument
  readonly title?: string
}

/** Immutable host-owned document and history. Editors only receive a binding to it. */
export interface ModelState {
  readonly sessionId: string
  readonly document: PuppetDocument
  readonly revision: number
  readonly snapshots: ReadonlyArray<ModelSnapshot>
  readonly index: number
  readonly sequence: number
  readonly limit: number
  readonly transaction: ModelTransaction | null
}

export interface ModelOrigin {
  readonly ownerId: string
  readonly requestId: string
  readonly transactionId?: string
}

export interface ModelChange {
  readonly sessionId: string
  readonly revision: number
  readonly kind: ModelHistoryKind | 'reset' | 'undo' | 'redo'
  readonly phase: 'update' | 'commit' | 'rollback'
  readonly historyKind: ModelHistoryKind
  readonly origin: ModelOrigin
}

export interface ModelWrite extends ModelOrigin {
  readonly type: ModelHistoryKind
  readonly document: PuppetDocument
  readonly expectedRevision: number
  /** Captured session identity for work performed outside this binding; omitted for same-binding synchronous edits. */
  readonly expectedSessionId?: string
  readonly title?: string
}

export interface ModelBegin extends ModelOrigin {
  readonly type: 'begin'
  readonly transactionId: string
  readonly title?: string
}

export interface ModelFinish extends ModelOrigin {
  readonly type: 'commit' | 'cancel'
  readonly transactionId: string
}

export interface ModelMove extends ModelOrigin {
  readonly type: 'undo' | 'redo' | 'go-to'
  readonly id?: number
}

export interface ModelReset extends ModelOrigin {
  readonly type: 'reset'
  readonly document: PuppetDocument
}

export interface ModelRelease extends ModelOrigin {
  readonly type: 'release'
}

export type ModelAction =
  | ModelWrite
  | ModelBegin
  | ModelFinish
  | ModelMove
  | ModelReset
  | ModelRelease

export interface ModelRejected {
  readonly ok: false
  readonly error: {
    readonly code:
      | 'busy'
      | 'stale-revision'
      | 'stale-session'
      | 'transaction-missing'
      | 'inactive'
      | 'invalid-document'
  }
}

export interface ModelApplied {
  readonly ok: true
  readonly state: ModelState
  readonly change: ModelChange | null
}

export type ModelResult = ModelApplied | ModelRejected

export interface ModelHistoryEntry {
  readonly id: number
  readonly title: string
  readonly state: 'past' | 'current' | 'future'
}

/** Read contract; historical document snapshots stay with the host. */
export interface ModelView {
  readonly sessionId: string
  readonly revision: number
  readonly document: PuppetDocument
  readonly entries: ReadonlyArray<ModelHistoryEntry>
  readonly undoCount: number
  readonly redoCount: number
  readonly transaction: ModelPendingTransaction | null
  readonly change: ModelChange | null
}

export interface ModelCompleted {
  readonly ok: true
  readonly changed: boolean
  readonly revision: number
}

export type ModelCommandResult = ModelCompleted | ModelRejected

/** The host owns this binding. Disposing an editor releases only its own pending transaction. */
export interface ModelBinding {
  /** Reactive document identity; transaction metadata alone must not notify this accessor. */
  readonly document: () => PuppetDocument
  /** Reactive document revision; opening or ending an unchanged transaction does not notify it. */
  readonly revision: () => number
  readonly read: () => ModelView
  readonly request: (action: ModelAction) => ModelCommandResult
}
