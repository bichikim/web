/** Promise의 이행 값은 유지하고, 거부되면 지정한 대체값을 반환한다. */
export const withPromiseFallback = <Value, Fallback>(
  promise: Promise<Value>,
  fallback: Fallback,
): Promise<Value | Fallback> => promise.catch(() => fallback)
