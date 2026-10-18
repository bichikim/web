export const validatePlaybackNumber = (value: number, name: string, minimum = 0): number => {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} must be finite and at least ${minimum}`)
  }
  return value
}
