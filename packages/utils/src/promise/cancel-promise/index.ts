export type CancelPromiseConstructor = (resolve, reject?) => void

export type CancelPromise<T = unknown> = Promise<T> & {cancel: () => void}
/**
 * @experimental
 * @param promise
 */
export const createCancelPromise = <T>(promise: Promise<T>): [Promise<T | null>, () => void] => {
  let cancel: () => void
  const cancelPromise = new Promise((resolve) => {
    cancel = () => resolve(null)
  })

  const racePromise: Promise<any> = Promise.race([cancelPromise, promise])

  return [racePromise, cancel]
}
