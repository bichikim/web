export interface TossStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export interface LatestStorageWriter {
  (value: unknown): Promise<void>
}

export type ParseStoredValue<Value> = (value: unknown) => Value | null
