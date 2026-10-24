import type {PuppetBreathParameter, PuppetDocument} from '../../player'

/** Seconds per breath for a new entry, near Cubism's sample periods (3.2–6.5 s). */
const DEFAULT_PERIOD = 3.5
const DEFAULT_WEIGHT = 0.5
/** A new entry swings a quarter of the parameter's range. */
const PEAK_OF_RANGE = 0.25
const HALF = 0.5

const withBreath = (
  document: PuppetDocument,
  breath: ReadonlyArray<PuppetBreathParameter>,
): PuppetDocument => {
  if (breath.length > 0) {
    return {...document, breath}
  }
  const {breath: _removed, ...rest} = document
  return rest
}

/**
 * Adds breathing on the first parameter without it, swinging around the middle of its range;
 * `undefined` when every parameter already breathes.
 */
export const addBreathParameter = (document: PuppetDocument): PuppetDocument | undefined => {
  const breath = document.breath ?? []
  const used = new Set(breath.map((entry) => entry.parameterId))
  const parameter = document.parameters?.find((candidate) => !used.has(candidate.id))
  if (parameter === undefined) {
    return undefined
  }
  const range = parameter.maximum - parameter.minimum
  const middle = (parameter.maximum + parameter.minimum) * HALF
  return withBreath(document, [
    ...breath,
    {
      offset: middle - parameter.defaultValue,
      parameterId: parameter.id,
      peak: range * PEAK_OF_RANGE,
      period: DEFAULT_PERIOD,
      weight: DEFAULT_WEIGHT,
    },
  ])
}

/**
 * Changes entry `index`; a parameter already breathing elsewhere or a non-positive period is
 * refused with `undefined`.
 */
export const updateBreathParameter = (
  document: PuppetDocument,
  index: number,
  changes: Partial<PuppetBreathParameter>,
): PuppetDocument | undefined => {
  const breath = document.breath ?? []
  const current = breath[index]
  if (current === undefined) {
    return undefined
  }
  const next = {...current, ...changes}
  const taken = breath.some((entry, at) => at !== index && entry.parameterId === next.parameterId)
  return taken || !(next.period > 0)
    ? undefined
    : withBreath(
        document,
        breath.map((entry, at) => (at === index ? next : entry)),
      )
}

export const removeBreathParameter = (document: PuppetDocument, index: number): PuppetDocument =>
  withBreath(
    document,
    (document.breath ?? []).filter((_, at) => at !== index),
  )
