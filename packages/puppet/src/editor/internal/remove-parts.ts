import {parseDocumentValue, type PuppetDocument} from '../../player'
import {mapDocumentReferences} from './document-references'

/** Removes parts and their references, including animation, masks and Glue connections. */
export const removeParts = (document: PuppetDocument, partIds: ReadonlySet<string>) =>
  parseDocumentValue(
    mapDocumentReferences({document, keepPart: (id) => !partIds.has(id), rename: (id) => id}),
  )
