import {
  type PuppetDocument,
  serializeDocumentChunks,
  serializePoffoDocument,
} from '@winter-love/puppet/player'

export type DocumentFileFormat = 'json' | 'poffo'

/** Creates file content; the environment adapter owns the destination and write completion. */
export const serializeDocumentFile = async (
  document: PuppetDocument,
  format: DocumentFileFormat,
  signal?: AbortSignal,
): Promise<Blob> => {
  signal?.throwIfAborted()
  return format === 'poffo'
    ? serializePoffoDocument(document, {signal})
    : new Blob([...serializeDocumentChunks(document)], {type: 'application/json'})
}
