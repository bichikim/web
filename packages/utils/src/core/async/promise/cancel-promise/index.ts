export type CancelPromiseConstructor = (resolve, reject?) => void

export type CancelPromise<T = unknown> = Promise<T> & {cancel: () => void}

const emptyCancel = () => {
  // empty
}

/**
 * @experimental
 * @param promise
 */
export const createCancelPromise = <T>(promise: Promise<T>): [Promise<T | null>, () => void] => {
  let cancel: () => void = emptyCancel

  const cancelPromise = new Promise<null>((resolve) => {
    cancel = () => resolve(null)
  })
  const racePromise: Promise<T | null> = Promise.race([cancelPromise, promise])

  return [racePromise, cancel]
}
