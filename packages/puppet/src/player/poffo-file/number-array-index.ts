interface NumberArrayEntry {
  readonly index: number
  readonly values: ReadonlyArray<number>
}

const fingerprint = (values: ReadonlyArray<number>): number => {
  const view = new DataView(new ArrayBuffer(Float64Array.BYTES_PER_ELEMENT))
  const FNV_PRIME = 16_777_619
  let hash = 2_166_136_261
  for (const value of values) {
    view.setFloat64(0, value, true)
    // eslint-disable-next-line no-bitwise -- Hash the exact IEEE 754 words; candidates still require Object.is equality.
    hash = Math.imul(hash ^ view.getUint32(0, true), FNV_PRIME)
    // eslint-disable-next-line no-bitwise -- The second word retains Float64 precision and signed zero.
    hash = Math.imul(hash ^ view.getUint32(Uint32Array.BYTES_PER_ELEMENT, true), FNV_PRIME)
  }
  return hash
}

/** Registers distinct numeric arrays in encounter order and returns only existing references. */
export const createNumberArrayIndex = () => {
  const buckets = new Map<number, NumberArrayEntry[]>()
  let size = 0
  return (values: ReadonlyArray<number>): number | undefined => {
    const hash = fingerprint(values)
    const entries = buckets.get(hash) ?? []
    const previous = entries.find(
      (entry) =>
        entry.values.length === values.length &&
        entry.values.every((value, index) => Object.is(value, values[index])),
    )
    if (previous !== undefined) {
      return previous.index
    }
    entries.push({index: size, values})
    buckets.set(hash, entries)
    size += 1
    return undefined
  }
}
