import {clamp} from 'es-toolkit/math'

/** Resolves the two surrounding samples and their interpolation weight. */
export const sampleBlend = (times: readonly number[], time: number) => {
  const later = times.findIndex((value) => value > time)
  const first = later < 0 ? Math.max(0, times.length - 1) : Math.max(0, later - 1)
  const next = Math.min(first + 1, times.length - 1)
  const span = times[next] - times[first]
  return {first, mix: span > 0 ? clamp((time - times[first]) / span, 0, 1) : 0, next}
}
