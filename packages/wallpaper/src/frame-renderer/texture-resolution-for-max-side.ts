import {clamp} from 'es-toolkit/math'

/** Returns a downscale factor capped by the longest texture side. */
export const textureResolutionForMaxSide = (maxSide: number, maxLength: number): number =>
  clamp(maxLength / Math.max(1, maxSide), 0, 1)
