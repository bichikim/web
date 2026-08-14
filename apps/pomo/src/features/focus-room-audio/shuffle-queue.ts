export interface CreateShuffleQueueOptions {
  readonly currentIndex?: number
  readonly trackCount: number
}

const getRandomIndex = (maximum: number) => Math.floor(Math.random() * maximum)

export const createShuffleQueue = (options: CreateShuffleQueueOptions): number[] => {
  const queue = Array.from({length: options.trackCount}, (_, index) => index).filter(
    (index) => index !== options.currentIndex,
  )

  for (let index = queue.length - 1; index > 0; index -= 1) {
    const randomIndex = getRandomIndex(index + 1)
    const currentValue = queue[index]
    queue[index] = queue[randomIndex]
    queue[randomIndex] = currentValue
  }

  return queue
}
