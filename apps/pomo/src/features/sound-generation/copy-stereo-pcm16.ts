import {PCM16_SCALE, STEREO_FRAME_BYTES} from './connection'

const SAMPLE_BYTES = 2

export interface CopyStereoPcm16Options {
  readonly frames: number
  readonly left: Float32Array
  readonly right: Float32Array
  readonly source: DataView
  readonly startFrame?: number
}

/** Copies little-endian stereo PCM16 frames into existing normalized channel buffers. */
export const copyStereoPcm16 = (options: CopyStereoPcm16Options): void => {
  const {frames, left, right, source, startFrame = 0} = options
  for (let frame = 0; frame < frames; frame += 1) {
    const target = startFrame + frame
    left[target] = source.getInt16(frame * STEREO_FRAME_BYTES, true) / PCM16_SCALE
    right[target] = source.getInt16(frame * STEREO_FRAME_BYTES + SAMPLE_BYTES, true) / PCM16_SCALE
  }
}
