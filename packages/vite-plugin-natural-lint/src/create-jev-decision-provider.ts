import type {DecisionAnswers, DecisionProvider, DecisionRequest} from './types'

export const createJevDecisionProvider = (
  send: (request: DecisionRequest) => Promise<DecisionAnswers>,
  concurrency: number,
): DecisionProvider => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('Jev concurrency must be a positive integer.')
  }
  let activeRequests = 0
  const waiting: Array<() => void> = []

  const reserve = async (): Promise<void> => {
    if (activeRequests < concurrency) {
      activeRequests += 1
      return
    }
    await new Promise<void>((resolve) => {
      waiting.push(resolve)
    })
  }

  const release = (): void => {
    const next = waiting.shift()
    if (next !== undefined) {
      next()
      return
    }
    activeRequests -= 1
  }

  return {
    close: () => Promise.resolve(),
    async decide(request) {
      await reserve()
      try {
        return await send(request)
      } finally {
        release()
      }
    },
  }
}
