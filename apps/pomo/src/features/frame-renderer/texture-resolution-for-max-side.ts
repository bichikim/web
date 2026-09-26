import {clampUnit} from 'src/utils/clamp-unit'

/** Returns a downscale factor capped by the longest texture side. */
export const textureResolutionForMaxSide = (maxSide: number, maxLength: number): number =>
  clampUnit(maxLength / Math.max(1, maxSide))
