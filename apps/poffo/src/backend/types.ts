import type {
  ModelAction,
  ModelChange,
  ModelCommandResult,
  ModelView,
} from '@winter-love/puppet/model'
import type {PuppetDocument} from '@winter-love/puppet/player'

export interface CreateModelBackendOptions {
  /** Session identity retained while attaching and changing views. */
  readonly sessionId: string
  /** Validated document owned by this backend. */
  readonly document: PuppetDocument
  /** Called before observers for completed edits; omitted when no recovery sink is attached. */
  readonly onCommit?: (document: PuppetDocument, change: ModelChange) => void
}

export interface ModelBackend {
  readonly read: () => ModelView
  readonly request: (action: ModelAction) => ModelCommandResult
  /** Observes every accepted state transition, including transaction metadata. Returns an unsubscribe function. */
  readonly subscribe: (listener: (view: ModelView) => void) => () => void
}
