import {withPromiseFallback} from '../with-promise-fallback'

/** Preserves fulfillment values and replaces rejections with null. */
export const withPromiseNull = <Value>(promise: Promise<Value>): Promise<Value | null> =>
  withPromiseFallback(promise, null)
