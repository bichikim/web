/** Preserves fulfillment values and replaces rejections with the supplied fallback. */
export const withPromiseFallback = <Value, Fallback>(
  promise: Promise<Value>,
  fallback: Fallback,
): Promise<Value | Fallback> => promise.catch(() => fallback)
