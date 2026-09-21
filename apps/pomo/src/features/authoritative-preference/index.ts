import {createAuthoritativeWriter} from '../preference-persistence'
export interface AuthoritativePreferenceStorage<Value> {
  readonly isNative: () => boolean
  readonly readWeb: () => Value | null
  readonly readNative: () => Promise<Value | null>
  /** Returns null on success or the persistence error on failure. */
  readonly writeWeb: (value: Value) => unknown | null
  readonly writeNative: (value: Value) => Promise<void>
}

export interface AuthoritativePreferenceRepository<Value> {
  readonly read: () => Promise<Value>
  readonly write: (value: Value) => Promise<void>
}

export interface CreateAuthoritativePreferenceRepositoryOptions<Value> {
  readonly storage: AuthoritativePreferenceStorage<Value>
  readonly defaultValue: Value
  readonly readFailureMessage: string
  readonly writeFailureMessage: string
}

/** Uses native storage as authority when available and otherwise persists to the web store. */
export const createAuthoritativePreferenceRepository = <Value>(
  options: CreateAuthoritativePreferenceRepositoryOptions<Value>,
): AuthoritativePreferenceRepository<Value> => {
  const {storage} = options
  return {
    async read() {
      if (!storage.isNative()) {
        return storage.readWeb() ?? options.defaultValue
      }
      try {
        const restored = (await storage.readNative()) ?? options.defaultValue
        storage.writeWeb(restored)
        return restored
      } catch (error: unknown) {
        throw new Error(options.readFailureMessage, {cause: error})
      }
    },
    write: createAuthoritativeWriter({
      failureMessage: options.writeFailureMessage,
      isNative: () => storage.isNative(),
      writeNative: (value) => storage.writeNative(value),
      writeWeb: (value) => storage.writeWeb(value),
    }),
  }
}
