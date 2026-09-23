/** Returns the cosine fade alpha for elapsed time, capped at its final frame. */
export const cosineEaseOutAlpha = (elapsed: number, duration: number): number => {
  const progress = Math.min(1, elapsed / duration)
  return (1 + Math.cos(Math.PI * progress)) / 2
}
