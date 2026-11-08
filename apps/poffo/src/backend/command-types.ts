import type {DocumentReadResult} from './read-document-source'
import type {ModelBackend} from './types'
import type {PuppetDocument} from '@winter-love/puppet/player'
import type {RenderedImage, RenderInput} from './render-types'

export interface CommandFileAdapter {
  readonly read: (path: string) => Promise<DocumentReadResult>
  readonly write: (path: string, content: Blob, overwrite: boolean) => Promise<void>
}

export interface CreateCommandServiceOptions {
  /** Single document/history owner shared by all clients. */
  readonly model: ModelBackend
  /** Optional local file access; browser-only backends omit path operations. */
  readonly files?: CommandFileAdapter
  /** Records the exact snapshot written by a save; omitted when the host does not track saved state. */
  readonly onSaved?: (document: PuppetDocument, revision: number) => void
  /** Optional renderer supplied by the execution environment. Its snapshot must match the captured revision. */
  readonly render?: (document: PuppetDocument, input: RenderInput) => Promise<RenderedImage>
}

export interface CommandSuccess {
  readonly ok: true
  readonly value: unknown
  readonly revision: number
  readonly sessionId: string
}

export interface CommandFailure {
  readonly ok: false
  readonly error: {readonly code: string; readonly message: string}
}

export type CommandResponse = CommandSuccess | CommandFailure
