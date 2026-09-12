import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

export interface ToolStorageAdapter {
  isNative(): boolean
  /** Reads parsed native data; platform failures reject the promise. */
  readNative<Value>(key: string, parse: (value: unknown) => Value | null): Promise<Value | null>
  /** Returns null for unavailable, missing, malformed, or invalid browser data. */
  readWeb<Value>(key: string, parse: (value: unknown) => Value | null): Value | null
  /** Returns null on success or the browser removal error. */
  removeWeb(key: string): unknown | null
  writeNative(key: string, value: unknown): Promise<void>
  /** Returns null on success or the browser write error. */
  writeWeb(key: string, value: unknown): unknown | null
}

export const toolStorageAdapter: ToolStorageAdapter = {
  isNative: hasNativeStorageBridge,
  readNative: readNativeStorageJson,
  readWeb: readWebStorageJson,
  removeWeb: removeWebStorageItem,
  writeNative: writeNativeStorageJson,
  writeWeb: writeWebStorageJson,
}
