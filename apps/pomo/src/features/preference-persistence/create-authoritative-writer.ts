export interface CreateAuthoritativeWriterOptions<Value> {
  readonly isNative: () => boolean
  /** Returns the storage error on failure, or null on success. */
  readonly removeWeb?: () => unknown | null
  readonly writeWeb: (value: Value) => unknown | null
  readonly writeNative: (value: Value) => Promise<void>
  readonly failureMessage: string
}

/** Writes the web copy first and removes a failed web copy after native success when supported. */
export const createAuthoritativeWriter =
  <Value>(options: CreateAuthoritativeWriterOptions<Value>): ((value: Value) => Promise<void>) =>
  async (value) => {
    const webError = options.writeWeb(value)
    if (!options.isNative()) {
      if (webError !== null) {
        throw new Error(options.failureMessage, {cause: webError})
      }
      return
    }
    try {
      await options.writeNative(value)
    } catch (error: unknown) {
      throw new Error(options.failureMessage, {cause: error})
    }

    if (webError !== null && options.removeWeb !== undefined) {
      const removalError = options.removeWeb()
      if (removalError !== null) {
        throw new Error(options.failureMessage, {cause: removalError})
      }
    }
  }
