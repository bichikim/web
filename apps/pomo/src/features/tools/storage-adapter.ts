import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

export interface ToolStorageAdapter {
  usesTossStorage(): boolean
  /** Reads parsed native data; platform failures reject the promise. */
  readToss<Value>(key: string, parse: (value: unknown) => Value | null): Promise<Value | null>
  /** Returns null for unavailable, missing, malformed, or invalid browser data. */
  readWeb<Value>(key: string, parse: (value: unknown) => Value | null): Value | null
  /** Returns null on success or the browser removal error. */
  removeWeb(key: string): unknown | null
  writeToss(key: string, value: unknown): Promise<void>
  /** Returns null on success or the browser write error. */
  writeWeb(key: string, value: unknown): unknown | null
}

export const toolStorageAdapter: ToolStorageAdapter = {
  readToss: readTossStorageJson,
  readWeb: readWebStorageJson,
  removeWeb: removeWebStorageItem,
  usesTossStorage: hasNativeStorageBridge,
  writeToss: writeTossStorageJson,
  writeWeb: writeWebStorageJson,
}
