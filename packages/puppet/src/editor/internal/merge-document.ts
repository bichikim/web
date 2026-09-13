import {collectDocumentIds, mapDocumentReferences} from './document-references'
import {parseDocumentValue, type PuppetDocument} from '../../player'
import {getDocumentScene} from '../../player/scene'

/** Appends an independently identified model while preserving the current viewport and model. */
export const mergeDocument = (document: PuppetDocument, incoming: PuppetDocument) => {
  const occupied = collectDocumentIds(document)
  const identifiers = collectDocumentIds(incoming)
  let index = 1
  while ([...identifiers].some((id) => occupied.has(`import-${index}:${id}`))) {
    index += 1
  }
  const rename = (id: string) => `import-${index}:${id}`
  const added = mapDocumentReferences({document: incoming, rename})
  return parseDocumentValue({
    ...document,
    glue: [...(document.glue ?? []), ...(added.glue ?? [])],
    motions: [...document.motions, ...added.motions],
    parameters: [...(document.parameters ?? []), ...(added.parameters ?? [])],
    parameterBindings: [...(document.parameterBindings ?? []), ...(added.parameterBindings ?? [])],
    parts: [...document.parts, ...added.parts],
    scene: {roots: [...getDocumentScene(document).roots, ...getDocumentScene(added).roots]},
  })
}
