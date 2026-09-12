import {clampUnit} from 'src/utils/clamp-unit'

const END_MARGIN = 0.05
const MAX_SAMPLES = 24
const SAMPLE_SECONDS = 5
/** Returns at most 24 sample positions, approximately five seconds apart. */
export const sampleTimes = (duration: number): number[] => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [0]
  }
  const end = Math.max(0, duration - END_MARGIN)
  const count = Math.min(MAX_SAMPLES, Math.max(2, Math.ceil(duration / SAMPLE_SECONDS) + 1))
  return Array.from({length: count}, (_, index) => (end * index) / (count - 1))
}

/** Resolves the two surrounding samples and their interpolation weight. */
export const sampleBlend = (times: readonly number[], time: number) => {
  const later = times.findIndex((value) => value > time)
  const first = later < 0 ? Math.max(0, times.length - 1) : Math.max(0, later - 1)
  const next = Math.min(first + 1, times.length - 1)
  const span = times[next] - times[first]
  return {first, mix: span > 0 ? clampUnit((time - times[first]) / span) : 0, next}
}
