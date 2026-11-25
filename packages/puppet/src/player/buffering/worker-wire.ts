import type {PackedBufferResponse} from './types'

export const encodeWorkerValue = (_key: string, value: unknown): unknown => {
  if (value instanceof Map) {
    return {__poffoMap: [...value]}
  }
  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      throw new TypeError('DataView is not a playback sample buffer')
    }
    return {
      __poffoTyped:
        value instanceof Float32Array
          ? Array.from(value)
          : Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)),
    }
  }
  if (value instanceof ArrayBuffer) {
    return undefined
  }
  if (value === undefined) {
    return {__poffoUndefined: true}
  }
  return Object.is(value, -0) ? {__poffoNumber: '-0'} : value
}
const isEntries = (value: unknown): value is ReadonlyArray<readonly [unknown, unknown]> =>
  Array.isArray(value) &&
  value.every((entry: unknown) => Array.isArray(entry) && entry.length === 2)
const decode = (value: unknown): unknown => {
  if (typeof value === 'object' && value !== null) {
    if ('__poffoMap' in value && Object.keys(value).length === 1 && isEntries(value.__poffoMap)) {
      return new Map(value.__poffoMap)
    }
    if (
      '__poffoUndefined' in value &&
      value.__poffoUndefined === true &&
      Object.keys(value).length === 1
    ) {
      return undefined
    }
    if (
      '__poffoNumber' in value &&
      value.__poffoNumber === '-0' &&
      Object.keys(value).length === 1
    ) {
      return -0
    }
  }
  return value
}

export const decodeWorkerResponse = (source: string): PackedBufferResponse => {
  const undefinedFields: Array<readonly [object, string]> = []
  const response: PackedBufferResponse = JSON.parse(
    source,
    function revive(this: unknown, key: string, value: unknown) {
      const decoded = decode(value)
      if (decoded === undefined && typeof this === 'object' && this !== null) {
        undefinedFields.push([this, key])
      }
      return decoded
    },
  )
  // JSON.parse removes undefined fields; checkpoints retain their explicitly undefined keys.
  for (const [target, key] of undefinedFields) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      value: undefined,
      writable: true,
    })
  }
  return response
}
