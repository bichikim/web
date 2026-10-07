import type {CodeDocument} from './contracts'

/** Identifies text documents and media documents with a readable source representation. */
export const hasDocumentSource = (document: CodeDocument): boolean =>
  document.media === undefined || document.source !== ''
