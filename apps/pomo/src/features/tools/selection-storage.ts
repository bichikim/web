import {z} from 'zod'
import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'
import {getUnits, type UnitCategory} from './units'

export interface UnitSelection {
  readonly category: UnitCategory
  readonly from: string
  readonly to: string
}
export interface MovingSelection {
  readonly year: string
  readonly month: string
}
export type LunarDirection = 'solar' | 'lunar'
export interface SelectionStorage<T> {
  readonly read: () => Promise<T | null>
  readonly write: (value: T) => Promise<void>
}
const createSelectionStorage = <T>(
  key: string,
  parse: (value: unknown) => T | null,
): SelectionStorage<T> => {
  let pending = Promise.resolve()
  let writeRevision = 0
  const read = async (): Promise<T | null> => {
    const revision = writeRevision
    const isNative = hasNativeStorageBridge()
    if (isNative) {
      await pending
      if (revision !== writeRevision) {
        return read()
      }
    }
    const webValue = readWebStorageJson(key, parse)
    if (webValue !== null || !isNative) {
      return webValue
    }
    try {
      const nativeValue = await readNativeStorageJson(key, parse)
      return revision === writeRevision ? nativeValue : read()
    } catch (error: unknown) {
      if (revision !== writeRevision) {
        return read()
      }
      throw error
    }
  }
  return {
    read,
    async write(value) {
      writeRevision += 1
      const revision = writeRevision
      const error = writeWebStorageJson(key, value)
      if (!hasNativeStorageBridge()) {
        if (error !== null) {
          throw new Error('Failed to save tool selection.', {cause: error})
        }
        return
      }
      const write = pending.then(async () => {
        await writeNativeStorageJson(key, value)
        // An older native completion must not discard a newer web selection.
        if (error !== null && revision === writeRevision) {
          const removalError = removeWebStorageItem(key)
          if (removalError !== null && readWebStorageJson(key, parse) !== null) {
            throw new Error('Failed to discard stale tool selection.', {cause: removalError})
          }
        }
      })
      pending = write.catch(() => undefined)
      await write
    },
  }
}
const unitSchema = z
  .object({
    category: z.enum(['length', 'mass', 'area', 'volume', 'temperature']),
    from: z.string(),
    to: z.string(),
  })
  .refine((value) => {
    const units = getUnits(value.category, 'ko')
    return (
      units.some((unit) => unit.id === value.from) && units.some((unit) => unit.id === value.to)
    )
  })
const FIRST_YEAR = 1900
const LAST_YEAR = 2050
const movingSchema = z.object({
  month: z.string().regex(/^(?:[1-9]|1[0-2])$/u),
  year: z
    .string()
    .regex(/^\d{4}$/u)
    .refine((value) => Number(value) >= FIRST_YEAR && Number(value) <= LAST_YEAR),
})
export const unitSelectionStorage = createSelectionStorage<UnitSelection>(
  'pomo:tool-units:v1',
  (value) => {
    const result = unitSchema.safeParse(value)
    return result.success ? result.data : null
  },
)
export const lunarDirectionStorage = createSelectionStorage<LunarDirection>(
  'pomo:tool-lunar-direction:v1',
  (value) => (value === 'solar' || value === 'lunar' ? value : null),
)
export const movingSelectionStorage = createSelectionStorage<MovingSelection>(
  'pomo:tool-moving:v1',
  (value) => {
    const result = movingSchema.safeParse(value)
    return result.success ? result.data : null
  },
)
