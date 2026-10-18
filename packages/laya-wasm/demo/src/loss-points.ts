export const lossPoints = (losses: readonly number[]): string => {
  if (losses.length === 0) {
    return ''
  }
  const width = 320
  const height = 96
  const inset = 4
  const {minimum, maximum} = losses.reduce(
    (bounds, loss) => ({
      maximum: Math.max(bounds.maximum, loss),
      minimum: Math.min(bounds.minimum, loss),
    }),
    {maximum: losses[0], minimum: losses[0]},
  )
  const range = maximum - minimum || 1
  return losses
    .map((loss, index) => {
      const horizontal = inset + (index / Math.max(1, losses.length - 1)) * (width - inset * 2)
      const vertical = height - inset - ((loss - minimum) / range) * (height - inset * 2)
      return `${horizontal},${vertical}`
    })
    .join(' ')
}
