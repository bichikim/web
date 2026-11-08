import type {Operation} from 'fast-json-patch'
import type {PuppetDocument} from '@winter-love/puppet/player'
import {applyDocumentPatch} from './apply-document-patch'
import {hashValue} from './hash-value'

/** Validates a complete candidate without changing the original document. */
export const previewDocumentPatch = async (
  document: PuppetDocument,
  patch: ReadonlyArray<Operation>,
) => {
  const candidate = applyDocumentPatch(document, patch)
  const fingerprint = await hashValue(candidate)
  return {document: candidate, fingerprint}
}
