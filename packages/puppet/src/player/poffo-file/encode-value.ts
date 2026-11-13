import {decodeAsset} from './base64'
import {createByteWriter} from './create-byte-writer'
import {getNumberPacking} from './number-packing'
import {MAX_VALUE_DEPTH, VALUE_TAG} from './tags'
import type {EncodedValue, PoffoAsset} from './types'

/** Encodes the JSON value tree, retaining exact numbers and extracting embedded binary assets. */
export const encodeValue = (source: unknown): EncodedValue => {
  const writer = createByteWriter()
  const strings = new Map<string, number>()
  const assets: PoffoAsset[] = []
  const ancestors = new WeakSet<object>()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder('utf-8', {ignoreBOM: true})
  const string = (value: string) => {
    const previous = strings.get(value)
    if (previous !== undefined) {
      writer.byte(VALUE_TAG.reference)
      writer.uint32(previous)
      return
    }
    strings.set(value, strings.size)
    const asset = decodeAsset(value)
    if (asset !== undefined) {
      writer.byte(VALUE_TAG.asset)
      writer.uint32(assets.length)
      assets.push(asset)
      return
    }
    const bytes = encoder.encode(value)
    // A JSON literal preserves lone UTF-16 surrogates that UTF-8 would replace.
    const escaped = decoder.decode(bytes) !== value
    const encoded = escaped ? encoder.encode(JSON.stringify(value)) : bytes
    writer.byte(escaped ? VALUE_TAG.escaped : VALUE_TAG.string)
    writer.uint32(encoded.length)
    writer.bytes(encoded)
  }
  const array = (values: ReadonlyArray<unknown>, depth: number) => {
    const packing = getNumberPacking(values)
    writer.byte(packing ?? VALUE_TAG.array)
    writer.uint32(values.length)
    for (const value of values) {
      if (packing === undefined) {
        write(value, depth + 1)
      } else {
        writePackedNumber(writer, packing, value as number)
      }
    }
  }
  const write = (value: unknown, depth: number): void => {
    if (depth > MAX_VALUE_DEPTH) {
      throw new TypeError('Poffo value nesting is too deep')
    }
    if (value === null || value === undefined) {
      writer.byte(VALUE_TAG.null)
      return
    }
    switch (typeof value) {
      case 'boolean':
        writer.byte(value ? VALUE_TAG.true : VALUE_TAG.false)
        return
      case 'number':
        if (!Number.isFinite(value)) {
          throw new TypeError('Non-finite Poffo number')
        }
        writer.byte(VALUE_TAG.number)
        writer.float64(value)
        return
      case 'string':
        string(value)
        return
      case 'object': {
        if (ancestors.has(value)) {
          throw new TypeError('Cyclic Poffo value')
        }
        ancestors.add(value)
        if (Array.isArray(value)) {
          array(value, depth)
        } else {
          const entries = Object.entries(value).filter(([, item]) => item !== undefined)
          writer.byte(VALUE_TAG.object)
          writer.uint32(entries.length)
          for (const [key, item] of entries) {
            string(key)
            write(item, depth + 1)
          }
        }
        ancestors.delete(value)
        return
      }
      default:
        throw new TypeError('Unsupported Poffo value')
    }
  }
  write(source, 0)
  return {...writer.finish(), assets}
}

const writePackedNumber = (
  writer: ReturnType<typeof createByteWriter>,
  packing: number,
  value: number,
) => {
  switch (packing) {
    case VALUE_TAG.uint8:
      writer.byte(value)
      return
    case VALUE_TAG.uint16:
      writer.uint16(value)
      return
    case VALUE_TAG.uint32:
      writer.uint32(value)
      return
    case VALUE_TAG.int32:
      writer.int32(value)
      return
    case VALUE_TAG.float32:
      writer.float32(value)
      return
    case VALUE_TAG.float64:
      writer.float64(value)
      return
    default:
      throw new TypeError('Unknown Poffo number packing')
  }
}
