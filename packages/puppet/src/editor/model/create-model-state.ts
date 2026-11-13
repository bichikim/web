import type {PuppetDocument} from '../../player/document'
import type {ModelState} from './types'

export interface CreateModelStateOptions {
  /** Identity retained across view changes; a new host session supplies a new identity. */
  readonly sessionId: string
  /** Validated document owned by the host. */
  readonly document: PuppetDocument
  /** Maximum undo steps; defaults to 100. */
  readonly limit?: number
}

const DEFAULT_HISTORY_LIMIT = 100

export const createModelState = (options: CreateModelStateOptions): ModelState => ({
  document: options.document,
  index: 0,
  limit: Math.max(1, Math.floor(options.limit ?? DEFAULT_HISTORY_LIMIT)),
  revision: 0,
  sequence: 0,
  sessionId: options.sessionId,
  snapshots: [{document: options.document, id: 0, kind: 'edit', title: '문서 열기'}],
  transaction: null,
})
