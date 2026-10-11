/** Resolves to true on fulfillment or false on rejection, discarding the value and rejection reason. */
export const isFulfilled = (promise: PromiseLike<unknown>): Promise<boolean> =>
  Promise.resolve(promise).then(
    () => true,
    () => false,
  )
