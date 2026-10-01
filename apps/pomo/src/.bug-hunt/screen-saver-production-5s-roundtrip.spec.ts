/** @vitest-environment node */

import {expect, it} from 'vitest'
import {z} from 'zod'

import {DEFAULT_SCREEN_SAVER_DELAY} from '../features/screen-saver/storage'

const productionScreenSaverDelaySchema = z.enum(['off', '1m', '10m', '20m', '1h'])
const productionStoredPreferenceSchema = z.object({
  delay: productionScreenSaverDelaySchema,
  savedAt: z.number().finite().nonnegative(),
})

const desktopSyncedDelay = {delay: '5s', savedAt: 1_700_000_000_000} as const

const readProductionDelay = (stored: unknown) => {
  const parsed = productionStoredPreferenceSchema.safeParse(stored)
  return parsed.success ? parsed.data.delay : DEFAULT_SCREEN_SAVER_DELAY
}

it('should accept a desktop-synced 5s screen saver delay in production storage', () => {
  expect(productionStoredPreferenceSchema.safeParse(desktopSyncedDelay).success).toBe(true)
  expect(readProductionDelay(desktopSyncedDelay)).toBe('5s')
})
