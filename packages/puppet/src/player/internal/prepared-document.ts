import type {PuppetDocument} from '../document'

declare const preparedDocumentBrand: unique symbol

export type PreparedPuppetDocument = PuppetDocument & {
  readonly [preparedDocumentBrand]: true
}

const preparedDocuments = new WeakMap<object, Blob | undefined>()

export const preparedRuntimeSection = (document: PuppetDocument): Blob | undefined =>
  preparedDocuments.get(document)

export function assertPreparedPuppetDocument(
  document: PuppetDocument,
): asserts document is PreparedPuppetDocument {
  if (!preparedDocuments.has(document)) {
    throw new TypeError('Puppet document must be prepared before it is passed to the player')
  }
}

export const isPreparedPuppetDocument = (value: unknown): value is PreparedPuppetDocument =>
  typeof value === 'object' && value !== null && preparedDocuments.has(value)

export const markPreparedPuppetDocument = (
  document: PuppetDocument,
  runtimeSection?: Blob,
): PreparedPuppetDocument => {
  preparedDocuments.set(document, runtimeSection)
  return document as PreparedPuppetDocument
}
