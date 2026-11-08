import jsonPatch, {type Operation} from 'fast-json-patch'
const {applyPatch} = jsonPatch
import {cloneDeep} from 'es-toolkit'
import {parseDocumentValue, type PuppetDocument} from '@winter-love/puppet/player'

/** Validates a candidate while retaining immutable source pixels and documents. */
export const applyDocumentPatch = (
  document: PuppetDocument,
  patch: ReadonlyArray<Operation>,
): PuppetDocument => {
  let candidate: unknown
  try {
    candidate = applyPatch(cloneDeep(document), [...patch], true, true, true).newDocument
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.split('\n')[0] : 'Patch failed'
    throw new Error(`invalid-patch: ${message}`, {cause})
  }
  const parsed = parseDocumentValue(candidate)
  if (!parsed.ok) {
    throw new Error(`invalid-document: ${parsed.error.code}`)
  }
  return parsed.document
}
