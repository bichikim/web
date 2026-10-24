const END_MARGIN = 0.05
const MAX_SAMPLES = 24
const SAMPLE_SECONDS = 5
/** Returns at most 24 sample positions, approximately five seconds apart. */
export const sampleTimes = (duration: number): number[] => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [0]
  }
  const end = duration <= END_MARGIN ? duration : duration - END_MARGIN
  const count = Math.min(MAX_SAMPLES, Math.max(2, Math.ceil(duration / SAMPLE_SECONDS) + 1))
  return Array.from({length: count}, (_, index) => (end * index) / (count - 1))
}

export {sampleBlend} from '@winter-love/wallpaper/frame-renderer/sample-blend'
