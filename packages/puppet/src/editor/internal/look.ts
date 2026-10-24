import type {PuppetDocument, PuppetLookParameter} from '../../player'

const withLook = (
  document: PuppetDocument,
  look: ReadonlyArray<PuppetLookParameter>,
): PuppetDocument => {
  if (look.length > 0) {
    return {...document, look}
  }
  const {look: _removed, ...rest} = document
  return rest
}

/**
 * Makes the first parameter without it follow the horizontal look with half its range (as
 * Cubism's sample turns the head ±30 of ±30); `undefined` when every parameter already does.
 */
export const addLookParameter = (document: PuppetDocument): PuppetDocument | undefined => {
  const look = document.look ?? []
  const used = new Set(look.map((entry) => entry.parameterId))
  const parameter = document.parameters?.find((candidate) => !used.has(candidate.id))
  if (parameter === undefined) {
    return undefined
  }
  const half = (parameter.maximum - parameter.minimum) / 2
  return withLook(document, [...look, {parameterId: parameter.id, x: half, xy: 0, y: 0}])
}

/** Changes entry `index`; a parameter that already follows the look elsewhere is refused. */
export const updateLookParameter = (
  document: PuppetDocument,
  index: number,
  changes: Partial<PuppetLookParameter>,
): PuppetDocument | undefined => {
  const look = document.look ?? []
  const current = look[index]
  if (current === undefined) {
    return undefined
  }
  const next = {...current, ...changes}
  return look.some((entry, at) => at !== index && entry.parameterId === next.parameterId)
    ? undefined
    : withLook(
        document,
        look.map((entry, at) => (at === index ? next : entry)),
      )
}

export const removeLookParameter = (document: PuppetDocument, index: number): PuppetDocument =>
  withLook(
    document,
    (document.look ?? []).filter((_, at) => at !== index),
  )
