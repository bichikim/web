interface DiagnosticEntry<Value> {
  readonly value: Value
  readonly bytes: number
}
const MAX_ENTRIES = 64
const MAX_ENTRY_BYTES = 8192
const MAX_BYTES = 65536
export interface DiagnosticLog<Value> {
  readonly append: (value: Value) => void
  readonly clear: () => void
  readonly omitted: () => number
  readonly read: () => readonly Value[]
}

/** Retains a bounded recent diagnostic sample independently of delivered analyzer results. */
export const createDiagnosticLog = <Value>(): DiagnosticLog<Value> => {
  const entries: DiagnosticEntry<Value>[] = []
  let bytes = 2
  let omitted = 0
  return {
    append: (value: Value): void => {
      const serialized = JSON.stringify(value)
      const size = serialized === undefined ? 0 : Buffer.byteLength(serialized) + 1
      if (size === 0 || size > MAX_ENTRY_BYTES) {
        omitted += 1
        return
      }
      entries.push({bytes: size, value})
      bytes += size
      while (entries.length > MAX_ENTRIES || bytes > MAX_BYTES) {
        const removed = entries.shift()
        if (removed !== undefined) {
          bytes -= removed.bytes
          omitted += 1
        }
      }
    },
    clear: (): void => {
      entries.length = 0
      bytes = 2
    },
    omitted: () => omitted,
    read: (): readonly Value[] => entries.map(({value}) => value),
  }
}
