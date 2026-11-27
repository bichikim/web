import {createByteReader} from './create-byte-reader'
import {MAX_VALUE_DEPTH, VALUE_TAG} from './tags'
import type {PoffoVersion} from './types'

interface DecodeValueOptions {
  /** Borrowed, fully decoded metadata bytes. */
  readonly bytes: Uint8Array
  /** Original data URLs in the asset index's order. */
  readonly assets: ReadonlyArray<string>
  /** Container version; omission reads v1 and rejects numeric array references. */
  readonly version?: PoffoVersion
}

/** Reads one complete value, rejecting truncation, invalid references and trailing data. */
export const decodeValue = (options: DecodeValueOptions): unknown => {
  const reader = createByteReader(options.bytes)
  const strings: string[] = []
  const numberArrays: number[][] = []
  const MAX_NUMERIC_BYTES = 536_870_912
  let numericBytes = 0
  const reserveNumbers = (length: number) => {
    numericBytes += length * Float64Array.BYTES_PER_ELEMENT
    if (options.version === 2 && numericBytes > MAX_NUMERIC_BYTES) {
      throw new SyntaxError('Poffo numeric arrays exceed the decoding budget')
    }
  }
  const decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true})
  const definedString = (value: unknown) => {
    if (typeof value !== 'string') {
      throw new SyntaxError('Invalid Poffo string')
    }
    strings.push(value)
    return value
  }
  const packedArray = (tag: number) => {
    const format = numberReader(tag)
    const length = reader.length(format.width)
    reserveNumbers(length)
    const bytes = reader.bytes(length * format.width)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const values: number[] = []
    for (let index = 0; index < length; index += 1) {
      values.push(format.read(view, index * format.width))
    }
    numberArrays.push(values)
    return values
  }
  const read = (depth: number): unknown => {
    if (depth > MAX_VALUE_DEPTH) {
      throw new SyntaxError('Poffo value nesting is too deep')
    }
    const tag = reader.byte()
    switch (tag) {
      case VALUE_TAG.null:
        return null
      case VALUE_TAG.false:
        return false
      case VALUE_TAG.true:
        return true
      case VALUE_TAG.number:
        return finiteNumber(reader.float64())
      case VALUE_TAG.string:
      case VALUE_TAG.escaped: {
        let text: string
        try {
          text = decoder.decode(reader.bytes(reader.length(1)))
        } catch (cause) {
          throw new SyntaxError('Invalid Poffo UTF-8', {cause})
        }
        return definedString(tag === VALUE_TAG.escaped ? JSON.parse(text) : text)
      }
      case VALUE_TAG.reference:
        return definedReference(strings, reader.uint32())
      case VALUE_TAG.numberReference: {
        const values = numberArrays[reader.uint32()]
        if (options.version !== 2 || values === undefined) {
          throw new SyntaxError('Invalid Poffo numeric array reference')
        }
        reserveNumbers(values.length)
        // Independent arrays retain JSON-style editing ownership after restoring shared storage.
        return values.slice()
      }
      case VALUE_TAG.asset:
        return definedString(definedReference(options.assets, reader.uint32()))
      case VALUE_TAG.array:
        return readArray(reader.length(1), () => read(depth + 1))
      case VALUE_TAG.object: {
        const length = reader.length(2)
        const value: Record<string, unknown> = {}
        for (let index = 0; index < length; index += 1) {
          const key = read(depth + 1)
          if (typeof key !== 'string' || Object.hasOwn(value, key)) {
            throw new SyntaxError('Invalid Poffo object key')
          }
          setField(value, key, read(depth + 1))
        }
        return value
      }
      default:
        return packedArray(tag)
    }
  }
  const value = read(0)
  if (!reader.ended()) {
    throw new SyntaxError('Trailing Poffo value bytes')
  }
  return value
}

const definedReference = (values: ReadonlyArray<string>, index: number): string => {
  const value = values[index]
  if (value === undefined) {
    throw new SyntaxError('Invalid Poffo string or asset reference')
  }
  return value
}

const setField = (object: Record<string, unknown>, key: string, value: unknown) => {
  if (Object.hasOwn(Object.prototype, key)) {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    })
  } else {
    object[key] = value
  }
}

const readArray = (length: number, read: () => unknown): unknown[] => {
  const values: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    values.push(read())
  }
  return values
}

const numberReader = (tag: number) => {
  switch (tag) {
    case VALUE_TAG.uint8:
      return {read: (view: DataView, offset: number) => view.getUint8(offset), width: 1}
    case VALUE_TAG.uint16:
      return {read: (view: DataView, offset: number) => view.getUint16(offset, true), width: 2}
    case VALUE_TAG.uint32:
      return {read: (view: DataView, offset: number) => view.getUint32(offset, true), width: 4}
    case VALUE_TAG.int32:
      return {read: (view: DataView, offset: number) => view.getInt32(offset, true), width: 4}
    case VALUE_TAG.float32:
      return {
        read: (view: DataView, offset: number) => finiteNumber(view.getFloat32(offset, true)),
        width: 4,
      }
    case VALUE_TAG.float64:
      return {
        read: (view: DataView, offset: number) => finiteNumber(view.getFloat64(offset, true)),
        width: 8,
      }
    default:
      throw new SyntaxError('Unknown Poffo numeric tag')
  }
}

const finiteNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    throw new SyntaxError('Non-finite Poffo number')
  }
  return value
}
