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
  const pendulums = [...(document.physics?.pendulums ?? []), ...(added.physics?.pendulums ?? [])]
  return parseDocumentValue({
    ...document,
    glue: [...(document.glue ?? []), ...(added.glue ?? [])],
    layerOrderRules: [...(document.layerOrderRules ?? []), ...(added.layerOrderRules ?? [])],
    motions: [...document.motions, ...added.motions],
    parameterBindings: [...(document.parameterBindings ?? []), ...(added.parameterBindings ?? [])],
    parameters: [...(document.parameters ?? []), ...(added.parameters ?? [])],
    parts: [...document.parts, ...added.parts],
    physics: pendulums.length === 0 ? undefined : {pendulums},
    scene: {roots: [...getDocumentScene(document).roots, ...getDocumentScene(added).roots]},
  })
}
