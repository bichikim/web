/** Creates a promise with externally controlled completion. */
export const createDeferred = <Value = void>() => Promise.withResolvers<Value>()
