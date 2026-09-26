import {clampUnit} from 'src/utils/clamp-unit'
/** Returns the cosine fade alpha for elapsed time, capped at its final frame. */
export const cosineEaseOutAlpha = (elapsed: number, duration: number): number => {
  const progress = clampUnit(elapsed / duration)
  return (1 + Math.cos(Math.PI * progress)) / 2
}
