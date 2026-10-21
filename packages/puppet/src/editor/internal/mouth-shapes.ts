import type {PuppetParameterValueMap} from '../../deformation'
import {
  PUPPET_VOWELS,
  type PuppetDocument,
  type PuppetMouthShapes,
  type PuppetVowel,
} from '../../player'
import {resolveParameterValue} from '../../player/parameter-value'

/** Sets or, with `undefined`, removes the document's mouth shapes. */
const withMouthShapes = (
  document: PuppetDocument,
  mouthShapes: PuppetMouthShapes | undefined,
): PuppetDocument => {
  if (mouthShapes !== undefined) {
    return {...document, mouthShapes}
  }
  const {mouthShapes: _removed, ...rest} = document
  return rest
}

/** One value list per vowel. */
export const mapVowels = (map: (vowel: PuppetVowel) => ReadonlyArray<number>) =>
  Object.fromEntries(PUPPET_VOWELS.map((vowel) => [vowel, map(vowel)])) as Record<
    PuppetVowel,
    ReadonlyArray<number>
  >

/** Keeps the shapes of the parameters `keep` accepts; none left removes the shapes. */
const filterParameters = (document: PuppetDocument, keep: (id: string) => boolean) => {
  const shapes = document.mouthShapes
  if (shapes === undefined) {
    return document
  }
  const kept = shapes.parameterIds.flatMap((id, index) => (keep(id) ? [index] : []))
  return withMouthShapes(
    document,
    kept.length === 0
      ? undefined
      : {
          ...shapes,
          parameterIds: kept.map((index) => shapes.parameterIds[index]!),
          vowels: mapVowels((vowel) => kept.map((index) => shapes.vowels[vowel][index]!)),
        },
  )
}

/**
 * Adds the parameter to the mouth shapes, every vowel starting at its default value, or removes
 * it from them.
 */
export const setMouthShapeParameter = (
  document: PuppetDocument,
  parameterId: string,
  enabled: boolean,
): PuppetDocument => {
  const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
  const listed = document.mouthShapes?.parameterIds.includes(parameterId) === true
  if (!enabled || parameter === undefined) {
    return filterParameters(document, (id) => id !== parameterId)
  }
  if (listed) {
    return document
  }
  const shapes = document.mouthShapes
  return withMouthShapes(document, {
    ...shapes,
    parameterIds: [...(shapes?.parameterIds ?? []), parameterId],
    vowels: mapVowels((vowel) => [...(shapes?.vowels[vowel] ?? []), parameter.defaultValue]),
  })
}

/** Drops removed parameters from the mouth shapes. */
export const removeMouthShapeParameters = (
  document: PuppetDocument,
  removedParameterIds: ReadonlySet<string>,
) => filterParameters(document, (id) => !removedParameterIds.has(id))

/** Stores the current values of the mouth-shape parameters as `vowel`'s shape. */
export const setMouthShape = (
  document: PuppetDocument,
  vowel: PuppetVowel,
  parameterValues: PuppetParameterValueMap,
): PuppetDocument => {
  const shapes = document.mouthShapes
  if (shapes === undefined) {
    return document
  }
  const values = shapes.parameterIds.map((id) => {
    const parameter = document.parameters?.find((candidate) => candidate.id === id)
    return parameter === undefined ? 0 : resolveParameterValue(parameter, parameterValues[id])
  })
  return withMouthShapes(document, {
    ...shapes,
    vowels: mapVowels((candidate) => (candidate === vowel ? values : shapes.vowels[candidate])),
  })
}

/** Seconds the shown vowel weights take to follow analysis. */
export const setMouthShapeSmoothing = (document: PuppetDocument, smoothing: number) =>
  document.mouthShapes === undefined || !(smoothing >= 0)
    ? document
    : withMouthShapes(document, {...document.mouthShapes, smoothing})
