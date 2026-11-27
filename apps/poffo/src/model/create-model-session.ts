import {createModelBinding, type ModelBinding, type ModelChange} from '@winter-love/puppet/editor'
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
export const createModelSession = (options: CreateModelSessionOptions): ModelBinding =>
  createModelBinding({
    document: options.document,
    onApply: ({state, change}) => {
      if (change?.phase === 'commit' && change.kind !== 'reset') {
        options.onCommit?.(state.document, change)
      }
    },
    sessionId: options.sessionId,
  })
