export interface StringStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export interface RemovableStringStorage extends StringStorage {
  readonly removeItem: (key: string) => void
}

export interface ValueCodec<Value> {
  readonly decode: (stored: string) => Value | null
  readonly encode: (value: Value) => string
}

export interface ValueStorage<Value> {
  readonly read: () => Value | null
  readonly write: (value: Value) => void
}

export interface CreateValueStorageOptions<Value> extends ValueCodec<Value> {
  readonly key: string
  readonly storage: () => StringStorage
}
