import {clamp} from 'es-toolkit/math'

export const cosineEaseOutAlpha = (elapsed: number, duration: number): number =>
  (1 + Math.cos(clamp(elapsed / duration, 0, 1) * Math.PI)) / 2
