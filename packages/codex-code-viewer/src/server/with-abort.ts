import {addAbortListener} from 'node:events'

/** Cancels a wait while leaving ownership of the underlying operation with its caller. */
export const withAbort = async <Value>(
  operation: Promise<Value>,
  signal?: AbortSignal,
): Promise<Value> => {
  if (signal === undefined) {
    return operation
  }
  signal.throwIfAborted()
  const aborted = Promise.withResolvers<never>()
  const listener = addAbortListener(signal, () => aborted.reject(signal.reason))
  try {
    return await Promise.race([operation, aborted.promise])
  } finally {
    listener[Symbol.dispose]()
  }
}
