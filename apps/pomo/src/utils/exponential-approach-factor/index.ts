/** Returns the frame-independent approach factor for an elapsed interval and time constant. */
export const exponentialApproachFactor = (elapsed: number, timeConstant: number): number =>
  1 - Math.exp(-elapsed / timeConstant)
