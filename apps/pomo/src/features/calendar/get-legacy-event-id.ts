import {z} from 'zod'

import type {CalendarProviderId} from './types'

interface EventIdentity {
  readonly id: string
  readonly provider: CalendarProviderId
}

const scopedIdentitySchema = z.tuple([z.string(), z.string()])

/** Returns the pre-calendar-scoping Google event identity, or null for other formats. */
export const getLegacyEventId = (event: EventIdentity): string | null => {
  if (event.provider !== 'google') {
    return null
  }

  const separator = event.id.indexOf(':')
  if (separator < 1) {
    return null
  }

  try {
    const value: unknown = JSON.parse(event.id.slice(separator + 1))
    const parsed = scopedIdentitySchema.safeParse(value)
    return parsed.success ? `${event.id.slice(0, separator)}:${parsed.data[1]}` : null
  } catch {
    return null
  }
}
