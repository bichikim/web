/** Promise가 이행되면 true, 거부되면 false로 이행하며, 값과 거부 사유는 버린다. */
export const isFulfilled = (promise: PromiseLike<unknown>): Promise<boolean> =>
  Promise.resolve(promise).then(
    () => true,
    () => false,
  )
