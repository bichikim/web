import {z} from 'zod'
import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
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
  let browserRevision = 0
  const read = async (): Promise<T | null> => {
    if (!hasNativeStorageBridge()) {
      return readWebStorageJson(key, parse)
    }
    const revision = writeRevision
    await pending
    const webSelection = readWebStorageJson(key, parse)
    if (webSelection !== null) {
      return webSelection
    }
    const nativeSelection = await readNativeStorageJson(key, parse).catch(() => null)
    const currentSelection = readWebStorageJson(key, parse)
    if (currentSelection !== null) {
      return currentSelection
    }
    return revision === writeRevision ? nativeSelection : read()
  }
  return {
    read,
    async write(value) {
      writeRevision += 1
      const error = writeWebStorageJson(key, value)
      if (error === null) {
        browserRevision += 1
      }
      const revision = browserRevision
      if (!hasNativeStorageBridge()) {
        if (error !== null) {
          throw new Error('Failed to save tool selection.', {cause: error})
        }
        return
      }
      const write = pending.then(async () => {
        await writeNativeStorageJson(key, value)
        if (
          error !== null &&
          revision === browserRevision &&
          readWebStorageJson(key, parse) !== null
        ) {
          // A successful native-only save must not be hidden by an older browser copy.
          localStorage.removeItem(key)
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
