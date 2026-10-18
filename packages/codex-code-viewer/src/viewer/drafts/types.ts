import type {CodeDocument, ViewerSession} from '../../shared/contracts'

export interface EditingDraft {
  readonly base: Pick<CodeDocument, 'location' | 'revision' | 'source'>
  readonly source: string
  readonly session: ViewerSession
  readonly deleted: boolean
}

export type DraftStorage = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
