interface Timing {
  readonly count: number
  readonly milliseconds: number
}
const NANOSECONDS_PER_MILLISECOND = 1_000_000

/** Measures completed operations with a monotonic clock. */
export const createTimings = () => {
  const entries = new Map<string, Timing>()
  const record = (name: string, started: bigint): void => {
    const previous = entries.get(name)
    entries.set(name, {
      count: (previous?.count ?? 0) + 1,
      milliseconds:
        (previous?.milliseconds ?? 0) +
        Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MILLISECOND,
    })
  }
  return {
    measure: <Value>(name: string, run: () => Value): Value => {
      const started = process.hrtime.bigint()
      try {
        return run()
      } finally {
        record(name, started)
      }
    },
    measureAsync: async <Value>(name: string, run: () => Promise<Value>): Promise<Value> => {
      const started = process.hrtime.bigint()
      try {
        return await run()
      } finally {
        record(name, started)
      }
    },
    read: (): Readonly<Record<string, Timing>> => Object.fromEntries(entries),
  }
}
