import {clampUnit} from '../clamp-unit'

/** Returns cosine-eased progress within the unit interval. */
export const cosineEaseInOut = (progress: number): number =>
  (1 - Math.cos(clampUnit(progress) * Math.PI)) / 2
