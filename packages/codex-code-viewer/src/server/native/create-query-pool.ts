/** Bounds asynchronous requests and releases capacity after either fulfillment or rejection. */
export const createQueryPool = (concurrency: number) => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('Query concurrency must be a positive integer')
  }
  let active = 0
  const queued: (() => void)[] = []
  return <Value>(run: () => Promise<Value>): Promise<Value> =>
    new Promise<Value>((resolve, reject) => {
      const start = (): void => {
        active += 1
        const completed = (): void => {
          active -= 1
          queued.shift()?.()
        }
        try {
          run().then(resolve, reject).finally(completed)
        } catch (error) {
          reject(error)
          completed()
        }
      }
      if (active < concurrency) {
        start()
      } else {
        queued.push(start)
      }
    })
}
