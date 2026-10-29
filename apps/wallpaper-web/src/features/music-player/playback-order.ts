interface ShuffleTrackOrderOptions {
  readonly ids: readonly string[]
  readonly previous?: string
  readonly random?: () => number
}

export const shuffleTrackOrder = (options: ShuffleTrackOrderOptions): readonly string[] => {
  const random = options.random ?? Math.random
  const order = [...options.ids]
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const previous = order[index]!
    order[index] = order[target]!
    order[target] = previous
  }
  if (order.length > 1 && order[0] === options.previous) {
    const target = 1 + Math.floor(random() * (order.length - 1))
    const previous = order[0]!
    order[0] = order[target]!
    order[target] = previous
  }
  return order
}
