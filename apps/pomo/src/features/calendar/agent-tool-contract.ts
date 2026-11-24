import {z} from 'zod'

const LOCAL_MINUTE_LENGTH = 'YYYY-MM-DDTHH:mm'.length

export const calendarToolCallSchema = z.strictObject({
  at: z.string().max(LOCAL_MINUTE_LENGTH),
  end: z.string().max(LOCAL_MINUTE_LENGTH),
  name: z.enum(['calendar_lookup', 'none']),
  start: z.string().max(LOCAL_MINUTE_LENGTH),
})
export const CALENDAR_TOOL_OUTPUT_SCHEMA = z.toJSONSchema(calendarToolCallSchema)
export type CalendarToolCall = z.infer<typeof calendarToolCallSchema>

export interface CalendarToolClock {
  readonly now: string
  readonly timeZone: string
}

export const createCalendarToolClock = (): CalendarToolClock => ({
  now: new Date().toISOString(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})
