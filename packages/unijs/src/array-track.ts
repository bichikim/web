export interface ProxyResult<T> {
  addNewObserver: (index: number, value: T) => void
  isUpdated: (index: number) => boolean
  proxy: Record<number, any>
  track: WeakMap<any, {now?: number | boolean; prev: number}>
}

export interface ChangeRecord {
  action: 'move' | 'delete' | 'insert' | 'update'
  from: number
  to?: number
  value?: any
  oldValue?: any
}

export const createProxy = <T>(original: T[]): ProxyResult<T> => {
  const track: WeakMap<any, {now?: number | boolean; prev: number}> = new WeakMap()
  const proxy = {}

  const addNewObserver = (original: T[], index: number, value: T) => {
    let oldValue = value
    const desc = Object.getOwnPropertyDescriptor(original, index)

    Object.defineProperty(proxy, index, {
      configurable: desc?.configurable ?? true,
      enumerable: desc?.enumerable ?? true,
      get() {
        if (!track.has(value)) {
          track.set(value, {prev: index})
        }
        return value
      },
      set(value: T) {
        const state = track.get(oldValue)
        if (state) {
          track.set(oldValue, {now: -1, prev: state.prev})
        }
        const newState = track.get(value)
        if (newState) {
          track.set(value, {now: true, prev: newState.prev})
        } else {
          track.set(value, {prev: index})
        }
        oldValue = value
        return true
      },
    })
  }

  const isUpdated = (index: number) => {
    const value = proxy[index]
    const state = track.get(value)
    if (state) {
      return state.now === true
    }
    return false
  }

  for (let index = 0; index < original.length; index += 1) {
    const value = original[index]
    addNewObserver(original, index, value)
  }

  return {
    addNewObserver: (index: number, value: T) => {
      addNewObserver(original, index, value)
    },
    isUpdated,
    proxy,
    track,
  }
}

export const createArrayTrack = <T>(
  value: T[],
): Array<T> & {
  changes: () => Record<string | number, ChangeRecord>
  clearChanges: () => void
} => {
  const original = [...value]
  const changeRecords: Map<string | number, ChangeRecord> = new Map()
  let changeCounter = 0

  const addChange = (change: ChangeRecord): void => {
    changeRecords.set(changeCounter++, change)
  }

  const array = {
    // Array methods
    push: (...args: T[]): number => {
      const startIndex = original.length
      original.push(...args)

      // Track insertions
      for (let i = 0; i < args.length; i++) {
        addChange({
          action: 'insert',
          from: startIndex + i,
          value: args[i]
        })

        // Add indexed access for new elements
        Object.defineProperty(array, startIndex + i, {
          get() {
            return original[startIndex + i]
          },
          set(newValue: T) {
            const oldValue = original[startIndex + i]
            original[startIndex + i] = newValue
            addChange({
              action: 'update',
              from: startIndex + i,
              value: newValue,
              oldValue: oldValue
            })
          },
          enumerable: true,
          configurable: true
        })
      }
      return original.length
    },

    pop: (): T | undefined => {
      if (original.length === 0) return undefined
      const result = original.pop()
      addChange({
        action: 'delete',
        from: original.length,
        value: result
      })

      // Remove indexed access for deleted element
      delete (array as any)[original.length]
      return result
    },

    shift: (): T | undefined => {
      if (original.length === 0) return undefined
      const result = original.shift()
      addChange({
        action: 'delete',
        from: 0,
        value: result
      })

      // Update indices for remaining elements
      for (let i = 0; i < original.length; i++) {
        addChange({
          action: 'move',
          from: i + 1,
          to: i
        })
      }

      // Reindex remaining elements
      for (let i = 0; i < original.length; i++) {
        Object.defineProperty(array, i, {
          get() {
            return original[i]
          },
          set(newValue: T) {
            const oldValue = original[i]
            original[i] = newValue
            addChange({
              action: 'update',
              from: i,
              value: newValue,
              oldValue: oldValue
            })
          },
          enumerable: true,
          configurable: true
        })
      }

      // Remove the last indexed property
      delete (array as any)[original.length]
      return result
    },

    unshift: (...args: T[]): number => {
      // Track insertions
      for (let i = 0; i < args.length; i++) {
        addChange({
          action: 'insert',
          from: i,
          value: args[i]
        })
      }

      // Update indices for existing elements
      for (let i = 0; i < original.length; i++) {
        addChange({
          action: 'move',
          from: i,
          to: i + args.length
        })
      }

      original.unshift(...args)

      // Reindex all elements after unshift
      for (let i = 0; i < original.length; i++) {
        Object.defineProperty(array, i, {
          get() {
            return original[i]
          },
          set(newValue: T) {
            const oldValue = original[i]
            original[i] = newValue
            addChange({
              action: 'update',
              from: i,
              value: newValue,
              oldValue: oldValue
            })
          },
          enumerable: true,
          configurable: true
        })
      }

      return original.length
    },

    splice: (start: number, deleteCount?: number, ...items: T[]): T[] => {
      const deleted = original.splice(start, deleteCount || 0, ...items)

      // Track deletions
      for (let i = 0; i < deleted.length; i++) {
        addChange({
          action: 'delete',
          from: start + i,
          value: deleted[i]
        })
      }

      // Track insertions
      for (let i = 0; i < items.length; i++) {
        addChange({
          action: 'insert',
          from: start + i,
          value: items[i]
        })
      }

      // Reindex all elements after splice
      for (let i = 0; i < original.length; i++) {
        Object.defineProperty(array, i, {
          get() {
            return original[i]
          },
          set(newValue: T) {
            const oldValue = original[i]
            original[i] = newValue
            addChange({
              action: 'update',
              from: i,
              value: newValue,
              oldValue: oldValue
            })
          },
          enumerable: true,
          configurable: true
        })
      }

      // Remove excess indexed properties
      for (let i = original.length; i < Object.keys(array).filter(k => /^\d+$/.test(k)).length; i++) {
        delete (array as any)[i]
      }

      return deleted
    },

    reverse: (): T[] => {
      const result = original.reverse()

      // Track position changes
      for (let i = 0; i < result.length; i++) {
        addChange({
          action: 'move',
          from: result.length - 1 - i,
          to: i
        })
      }

      return result
    },

    sort: (compareFn?: (a: T, b: T) => number): T[] => {
      const originalOrder = [...original]
      const result = original.sort(compareFn)

      // Track position changes
      for (let i = 0; i < result.length; i++) {
        const originalIndex = originalOrder.indexOf(result[i])
        if (originalIndex !== i) {
          addChange({
            action: 'move',
            from: originalIndex,
            to: i
          })
        }
      }

      return result
    },

    fill: (value: T, start?: number, end?: number): T[] => {
      const result = original.fill(value, start, end)
      const startIndex = start || 0
      const endIndex = end || original.length

      for (let i = startIndex; i < endIndex; i++) {
        addChange({
          action: 'update',
          from: i,
          value: value,
          oldValue: original[i]
        })
      }

      return result
    },

    copyWithin: (target: number, start: number, end?: number): T[] => {
      const result = original.copyWithin(target, start, end)

      for (let i = target; i < Math.min(target + (end || original.length) - start, original.length); i++) {
        addChange({
          action: 'update',
          from: i,
          value: result[i],
          oldValue: original[i]
        })
      }

      return result
    },

    concat: (...items: T[]): T[] => {
      const result = original.concat(...items)

      for (let i = 0; i < items.length; i++) {
        addChange({
          action: 'insert',
          from: original.length + i,
          value: items[i]
        })
      }

      return result
    },

    // Other array methods
    slice: (start?: number, end?: number): T[] => original.slice(start, end),
    indexOf: (searchElement: T, fromIndex?: number): number => original.indexOf(searchElement, fromIndex),
    lastIndexOf: (searchElement: T, fromIndex?: number): number => original.lastIndexOf(searchElement, fromIndex),
    includes: (searchElement: T, fromIndex?: number): boolean => original.includes(searchElement, fromIndex),
    join: (separator?: string): string => original.join(separator),
    toString: (): string => original.toString(),
    toLocaleString: (): string => original.toLocaleString(),
    forEach: (callbackfn: (value: T, index: number, array: T[]) => void): void => original.forEach(callbackfn),
    map: <U>(callbackfn: (value: T, index: number, array: T[]) => U): U[] => original.map(callbackfn),
    filter: (callbackfn: (value: T, index: number, array: T[]) => boolean): T[] => original.filter(callbackfn),
    reduce: <U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U => original.reduce(callbackfn, initialValue),
    reduceRight: <U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U => original.reduceRight(callbackfn, initialValue),
    every: (callbackfn: (value: T, index: number, array: T[]) => boolean): boolean => original.every(callbackfn),
    some: (callbackfn: (value: T, index: number, array: T[]) => boolean): boolean => original.some(callbackfn),
    find: (callbackfn: (value: T, index: number, array: T[]) => boolean): T | undefined => original.find(callbackfn),
    findIndex: (callbackfn: (value: T, index: number, array: T[]) => boolean): number => original.findIndex(callbackfn),
    entries: (): IterableIterator<[number, T]> => original.entries(),
    keys: (): IterableIterator<number> => original.keys(),
    values: (): IterableIterator<T> => original.values(),
    at: (index: number): T | undefined => original.at(index),
    flat: (depth?: number): any[] => original.flat(depth),
    flatMap: <U>(callbackfn: (value: T, index: number, array: T[]) => U | readonly U[]): U[] => original.flatMap(callbackfn),

    // Custom methods for tracking changes
    changes: (): Record<string | number, ChangeRecord> => {
      const result: Record<string | number, ChangeRecord> = {}
      changeRecords.forEach((change, key) => {
        result[key] = change
      })
      return result
    },

    clearChanges: (): void => {
      changeRecords.clear()
      changeCounter = 0
    }
  }

  // Add indexed access
  for (let i = 0; i < value.length; i++) {
    Object.defineProperty(array, i, {
      get() {
        return original[i]
      },
      set(newValue: T) {
        const oldValue = original[i]
        original[i] = newValue
        addChange({
          action: 'update',
          from: i,
          value: newValue,
          oldValue: oldValue
        })
      },
      enumerable: true,
      configurable: true
    })
  }

  // Add length property
  Object.defineProperty(array, 'length', {
    get() {
      return original.length
    },
    set(newLength: number) {
      const oldLength = original.length
      if (newLength < oldLength) {
        // Truncating - track deletions
        for (let i = newLength; i < oldLength; i++) {
          addChange({
            action: 'delete',
            from: i,
            value: original[i]
          })
        }
      } else if (newLength > oldLength) {
        // Extending - track insertions
        for (let i = oldLength; i < newLength; i++) {
          addChange({
            action: 'insert',
            from: i,
            value: undefined as any
          })
        }
      }
      original.length = newLength
    },
    enumerable: false,
    configurable: false
  })

  // Make it look like an Array instance
  Object.setPrototypeOf(array, Array.prototype)

  return array as any
}
