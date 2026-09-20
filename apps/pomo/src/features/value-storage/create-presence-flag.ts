import {createValueStorage} from './create-value-storage'
import type {StringStorage} from './types'

export interface CreatePresenceFlagOptions {
  readonly key: string
  readonly storage: () => StringStorage
}

export interface PresenceFlag {
  readonly read: () => boolean
  readonly write: () => void
}

/** Records key presence with best-effort storage; unavailable reads are false and writes are ignored. */
export const createPresenceFlag = (options: CreatePresenceFlagOptions): PresenceFlag => {
  const value = createValueStorage({
    ...options,
    decode: () => true,
    encode: () => 'true',
  })
  return {
    read() {
      try {
        return value.read() ?? false
      } catch {
        return false
      }
    },
    write() {
      try {
        value.write(true)
      } catch {
        // A presence marker must not prevent the associated user action.
      }
    },
  }
}
