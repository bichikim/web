import {collectDocumentIds, mapDocumentReferences} from './document-references'
import {parseDocumentValue, type PuppetDocument} from '../../player'
import {mapVowels} from './mouth-shapes'
import {getDocumentScene} from '../../player/scene'

const listed = <T>(items: ReadonlyArray<T>) => (items.length === 0 ? undefined : items)

/** Concatenates optional preset collections, omitting empty results. */
const mergePresets = (document: PuppetDocument, added: PuppetDocument) => ({
  expressions: listed([...(document.expressions ?? []), ...(added.expressions ?? [])]),
  hitAreas: listed([...(document.hitAreas ?? []), ...(added.hitAreas ?? [])]),
  poseGroups: listed([...(document.poseGroups ?? []), ...(added.poseGroups ?? [])]),
})

/** Joins parameter roles, keeping each role's current parameters first. */
const mergeRoles = (document: PuppetDocument, added: PuppetDocument) => {
  const join = (key: 'eyeBlink' | 'lipSync') =>
    listed([...(document.parameterRoles?.[key] ?? []), ...(added.parameterRoles?.[key] ?? [])])
  const roles = {eyeBlink: join('eyeBlink'), lipSync: join('lipSync')}
  return roles.eyeBlink === undefined && roles.lipSync === undefined ? undefined : roles
}

/** Joins mouth shapes, keeping the current document's smoothing and parameters first. */
const mergeMouthShapes = (document: PuppetDocument, added: PuppetDocument) => {
  const [current, incoming] = [document.mouthShapes, added.mouthShapes]
  if (current === undefined || incoming === undefined) {
    return current ?? incoming
  }
  return {
    ...current,
    parameterIds: [...current.parameterIds, ...incoming.parameterIds],
    vowels: mapVowels((vowel) => [...current.vowels[vowel], ...incoming.vowels[vowel]]),
  }
}

/** Joins physics, keeping the current document's world settings (fps, gravity, wind). */
const mergePhysics = (document: PuppetDocument, added: PuppetDocument) => {
  const pendulums = [...(document.physics?.pendulums ?? []), ...(added.physics?.pendulums ?? [])]
  const chains = listed([...(document.physics?.chains ?? []), ...(added.physics?.chains ?? [])])
  const world = document.physics ?? added.physics
  return pendulums.length === 0 && chains === undefined ? undefined : {...world, chains, pendulums}
}

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
    ...mergePresets(document, added),
    breath: listed([...(document.breath ?? []), ...(added.breath ?? [])]),
    glue: [...(document.glue ?? []), ...(added.glue ?? [])],
    glueComposition: document.glueComposition ?? added.glueComposition,
    layerOrderRules: [...(document.layerOrderRules ?? []), ...(added.layerOrderRules ?? [])],
    look: listed([...(document.look ?? []), ...(added.look ?? [])]),
    motions: [...document.motions, ...added.motions],
    mouthShapes: mergeMouthShapes(document, added),
    parameterBindings: [...(document.parameterBindings ?? []), ...(added.parameterBindings ?? [])],
    parameterGroups: listed([
      ...(document.parameterGroups ?? []),
      ...(added.parameterGroups ?? []),
    ]),
    parameterRoles: mergeRoles(document, added),
    parameters: [...(document.parameters ?? []), ...(added.parameters ?? [])],
    parts: [...document.parts, ...added.parts],
    physics: mergePhysics(document, added),
    scene: {roots: [...getDocumentScene(document).roots, ...getDocumentScene(added).roots]},
  })
}
