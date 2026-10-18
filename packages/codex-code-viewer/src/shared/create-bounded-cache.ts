interface CacheOptions<Value> {
  readonly maxEntries: number
  readonly maxWeight: number
  readonly weight: (value: Value) => number
}
interface CacheEntry<Value> {
  readonly value: Value
  readonly weight: number
}
export interface BoundedCache<Value> {
  get(key: string): Value | undefined
  set(key: string, value: Value): void
  delete(key: string): void
  clear(): void
}

/** Stores values within count and weight limits, evicting least recently used entries. */
export const createBoundedCache = <Value>(options: CacheOptions<Value>): BoundedCache<Value> => {
  if (
    !Number.isInteger(options.maxEntries) ||
    options.maxEntries < 0 ||
    !Number.isFinite(options.maxWeight) ||
    options.maxWeight < 0
  ) {
    throw new RangeError('Invalid cache limits.')
  }
  const entries = new Map<string, CacheEntry<Value>>()
  let weight = 0
  const remove = (key: string): void => {
    const entry = entries.get(key)
    if (entry !== undefined) {
      weight -= entry.weight
      entries.delete(key)
    }
  }
  return {
    clear: () => {
      entries.clear()
      weight = 0
    },
    delete: remove,
    get: (key) => {
      const entry = entries.get(key)
      if (entry === undefined) {
        return undefined
      }
      entries.delete(key)
      entries.set(key, entry)
      return entry.value
    },
    set: (key, value) => {
      const cost = options.weight(value)
      if (!Number.isFinite(cost) || cost < 0) {
        throw new RangeError('Invalid cache weight.')
      }
      remove(key)
      if (options.maxEntries === 0 || cost > options.maxWeight) {
        return
      }
      for (const oldest of entries.keys()) {
        if (entries.size >= options.maxEntries || weight + cost > options.maxWeight) {
          remove(oldest)
        }
      }
      entries.set(key, {value, weight: cost})
      weight += cost
    },
  }
}
