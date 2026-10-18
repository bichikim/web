import type {CodeDocument} from './contracts'

/** Identifies a document whose full source has not arrived yet. */
export const hasDeferredSource = (document: CodeDocument): boolean =>
  document.sourceLength !== undefined && document.source.length !== document.sourceLength
