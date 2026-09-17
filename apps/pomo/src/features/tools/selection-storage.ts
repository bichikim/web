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
  readonly key: string
  readonly parse: (value: unknown) => T | null
  readonly read: () => Promise<T | null>
  readonly write: (value: T) => Promise<void>
}
const createSelectionStorage = <T>(
  storage: ToolStorageAdapter,
  key: string,
  parse: (value: unknown) => T | null,
  reportRepairError: (error: unknown) => void,
): SelectionStorage<T> => {
  const read = async (): Promise<T | null> => {
    const usesTossStorage = storage.usesTossStorage()
    const webValue = storage.readWeb(key, parse)
    if (webValue !== null || !usesTossStorage) {
      if (webValue !== null && usesTossStorage) {
        await storage.writeToss(key, webValue).catch(reportRepairError)
      }
      return webValue
    }
    return storage.readToss(key, parse)
  }
  return {
    key,
    parse,
    read,
    async write(value) {
      const error = storage.writeWeb(key, value)
      if (!storage.usesTossStorage()) {
        if (error !== null) {
          throw new Error('Failed to save tool selection.', {cause: error})
        }
        return
      }
      await storage.writeToss(key, value)
      // Discard the stale web copy after its native replacement persists.
      if (error !== null) {
        const removalError = storage.removeWeb(key)
        if (removalError !== null && storage.readWeb(key, parse) !== null) {
          throw new Error('Failed to discard stale tool selection.', {cause: removalError})
        }
      }
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
  readonly reportRepairError: (error: unknown) => void
}

/** Reads and writes tool selections using one storage adapter. */
export const createToolSelectionStorages = (
  options: CreateToolSelectionStoragesOptions,
): ToolSelectionStorages => {
  const {storage, reportRepairError} = options
  const unitSelectionStorage = createSelectionStorage<UnitSelection>(
    storage,
    'pomo:tool-units:v1',
    (value) => {
      const result = unitSchema.safeParse(value)
      return result.success ? result.data : null
    },
    reportRepairError,
  )
  const lunarDirectionStorage = createSelectionStorage<LunarDirection>(
    storage,
    'pomo:tool-lunar-direction:v1',
    (value) => (value === 'solar' || value === 'lunar' ? value : null),
    reportRepairError,
  )
  const movingSelectionStorage = createSelectionStorage<MovingSelection>(
    storage,
    'pomo:tool-moving:v1',
    (value) => {
      const result = movingSchema.safeParse(value)
      return result.success ? result.data : null
    },
    reportRepairError,
  )
  return {lunarDirectionStorage, movingSelectionStorage, unitSelectionStorage}
}

export const {unitSelectionStorage, lunarDirectionStorage, movingSelectionStorage} =
  createToolSelectionStorages({
    reportRepairError: (error) => {
      console.warn('Failed to repair native tool selection.', error)
    },
    storage: toolStorageAdapter,
  })
