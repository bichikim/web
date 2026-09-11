import {z} from 'zod'
import {toolStorageAdapter, type ToolStorageAdapter} from './storage-adapter'
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
  storage: ToolStorageAdapter,
  key: string,
  parse: (value: unknown) => T | null,
): SelectionStorage<T> => {
  let pending = Promise.resolve()
  let writeRevision = 0
  const read = async (): Promise<T | null> => {
    const revision = writeRevision
    const isNative = storage.isNative()
    if (isNative) {
      await pending
      if (revision !== writeRevision) {
        return read()
      }
    }
    const webValue = storage.readWeb(key, parse)
    if (webValue !== null || !isNative) {
      return webValue
    }
    try {
      const nativeValue = await storage.readNative(key, parse)
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
      const error = storage.writeWeb(key, value)
      if (!storage.isNative()) {
        if (error !== null) {
          throw new Error('Failed to save tool selection.', {cause: error})
        }
        return
      }
      const write = pending.then(async () => {
        await storage.writeNative(key, value)
        // An older native completion must not discard a newer web selection.
        if (error !== null && revision === writeRevision) {
          const removalError = storage.removeWeb(key)
          if (removalError !== null && storage.readWeb(key, parse) !== null) {
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
export interface ToolSelectionStorages {
  readonly unitSelectionStorage: SelectionStorage<UnitSelection>
  readonly lunarDirectionStorage: SelectionStorage<LunarDirection>
  readonly movingSelectionStorage: SelectionStorage<MovingSelection>
}
export interface CreateToolSelectionStoragesOptions {
  readonly storage: ToolStorageAdapter
}

/** Creates independently queued selection repositories over one storage adapter. */
export const createToolSelectionStorages = (
  options: CreateToolSelectionStoragesOptions,
): ToolSelectionStorages => {
  const {storage} = options
  const unitSelectionStorage = createSelectionStorage<UnitSelection>(
    storage,
    'pomo:tool-units:v1',
    (value) => {
      const result = unitSchema.safeParse(value)
      return result.success ? result.data : null
    },
  )
  const lunarDirectionStorage = createSelectionStorage<LunarDirection>(
    storage,
    'pomo:tool-lunar-direction:v1',
    (value) => (value === 'solar' || value === 'lunar' ? value : null),
  )
  const movingSelectionStorage = createSelectionStorage<MovingSelection>(
    storage,
    'pomo:tool-moving:v1',
    (value) => {
      const result = movingSchema.safeParse(value)
      return result.success ? result.data : null
    },
  )
  return {lunarDirectionStorage, movingSelectionStorage, unitSelectionStorage}
}

export const {unitSelectionStorage, lunarDirectionStorage, movingSelectionStorage} =
  createToolSelectionStorages({storage: toolStorageAdapter})
