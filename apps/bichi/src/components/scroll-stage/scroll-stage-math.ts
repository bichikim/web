/** Clamp value between min and max (GSAP.utils.clamp equivalent). */
export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Linear interpolation (GSAP.utils.interpolate equivalent). */
export function lerp(current: number, target: number, ease: number): number {
  return current + (target - current) * ease
}
