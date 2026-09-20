export interface CreateAuthoritativeWriterOptions<Value> {
  readonly isNative: () => boolean
  readonly writeWeb: (value: Value) => unknown | null
  readonly writeNative: (value: Value) => Promise<void>
  readonly failureMessage: string
}

/** Writes the web copy first and requires persistence to the active runtime's authoritative store. */
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
  }
