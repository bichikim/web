import {createByteReader} from './create-byte-reader'
import {MAX_VALUE_DEPTH, VALUE_TAG} from './tags'

interface DecodeValueOptions {
  /** Borrowed, fully decoded metadata bytes. */
  readonly bytes: Uint8Array
  /** Original data URLs in the asset index's order. */
  readonly assets: ReadonlyArray<string>
}

/** Reads one complete value, rejecting truncation, invalid references and trailing data. */
export const decodeValue = (options: DecodeValueOptions): unknown => {
  const reader = createByteReader(options.bytes)
  const strings: string[] = []
  const decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true})
  const definedString = (value: unknown) => {
    if (typeof value !== 'string') {
      throw new SyntaxError('Invalid Poffo string')
    }
    strings.push(value)
    return value
  }
  const packedArray = (tag: number) => {
    const format = numberReader(reader, tag)
    const length = reader.length(format.width)
    return Array.from({length}, () => finiteNumber(format.read()))
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
      case VALUE_TAG.asset:
        return definedString(definedReference(options.assets, reader.uint32()))
      case VALUE_TAG.array: {
        const length = reader.length(1)
        return Array.from({length}, () => read(depth + 1))
      }
      case VALUE_TAG.object: {
        const length = reader.length(2)
        const value: Record<string, unknown> = {}
        for (let index = 0; index < length; index += 1) {
          const key = read(depth + 1)
          if (typeof key !== 'string' || Object.hasOwn(value, key)) {
            throw new SyntaxError('Invalid Poffo object key')
          }
          Object.defineProperty(value, key, {
            configurable: true,
            enumerable: true,
            value: read(depth + 1),
            writable: true,
          })
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

const numberReader = (reader: ReturnType<typeof createByteReader>, tag: number) => {
  switch (tag) {
    case VALUE_TAG.uint8:
      return {read: reader.byte, width: Uint8Array.BYTES_PER_ELEMENT}
    case VALUE_TAG.uint16:
      return {read: reader.uint16, width: Uint16Array.BYTES_PER_ELEMENT}
    case VALUE_TAG.uint32:
      return {read: reader.uint32, width: Uint32Array.BYTES_PER_ELEMENT}
    case VALUE_TAG.int32:
      return {read: reader.int32, width: Int32Array.BYTES_PER_ELEMENT}
    case VALUE_TAG.float32:
      return {read: reader.float32, width: Float32Array.BYTES_PER_ELEMENT}
    case VALUE_TAG.float64:
      return {read: reader.float64, width: Float64Array.BYTES_PER_ELEMENT}
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
