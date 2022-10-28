export type CancelPromiseConstructor = (resolve, reject?) => void

export type CancelPromise<T = unknown> = Promise<T> & {cancel: () => void}
/**
 * @experimental
 * @param constructor
 */
export const createCancelPromise = (constructor: CancelPromiseConstructor): CancelPromise => {
  const promise = new Promise<any>(constructor)
  let cancel: () => void
  const cancelPromise = new Promise((resolve) => {
    cancel = () => resolve(null)
  })

  const racePromise = Promise.race([cancelPromise, promise])

  return Object.assign(racePromise, {cancel})
}
