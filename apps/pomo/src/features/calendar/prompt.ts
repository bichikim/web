import {z} from 'zod'

import {dayjs} from 'src/utils/zoned-dayjs'
import {parseDate} from '../civil-date'
import 'dayjs/locale/ko'
import type {CalendarEvent} from './types'

interface CreateCalendarPromptContextOptions {
  readonly incomplete?: boolean
  readonly events: ReadonlyArray<CalendarEvent>
  readonly timeZone: string
}

const PROVIDER_LABELS = {
  google: 'Google',
  microsoft: 'Microsoft',
} as const

const dateTimeSchema = z.iso.datetime({offset: true})

const hasValidEventTimes = (event: CalendarEvent) =>
  event.allDay
    ? parseDate(event.start) !== null && parseDate(event.end) !== null
    : dateTimeSchema.safeParse(event.start).success && dateTimeSchema.safeParse(event.end).success

const formatEventTime = (event: CalendarEvent, timeZone: string) => {
  if (event.allDay) {
    const [year, month, day] = event.start.split('-').map(Number)
    return `${year}. ${month}. ${day}. 종일`
  }

  const start = dayjs(new Date(event.start)).tz(timeZone).locale('ko')
  const end = dayjs(new Date(event.end)).tz(timeZone).locale('ko')
  const endFormat =
    start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD') ? 'A h:mm' : 'YYYY. M. D. A h:mm'
  return `${start.format('YYYY. M. D. A h:mm')}–${end.format(endFormat)}`
}

const formatEvent = (event: CalendarEvent, timeZone: string) =>
  `- [${PROVIDER_LABELS[event.provider]} · ${event.accountLabel} · ${event.calendarLabel}] ` +
  `${formatEventTime(event, timeZone)} · ${event.title}`

/** Produces a compact, provider-neutral calendar grounding block for local chat generation. */
export const createCalendarPromptContext = (
  options: CreateCalendarPromptContextOptions,
): string => {
  const events = options.events.filter(hasValidEventTimes)
  const incomplete = options.incomplete === true || events.length < options.events.length
  const header = [
    incomplete
      ? '일부 일정만 확인했습니다. 누락 가능성을 알리고, 전체 일정이나 일정이 없다고 단정하지 마세요.'
      : '캘린더 조회 결과입니다. 이 정보에만 근거해 답하고, 일정이 없으면 없다고 말하세요.',
    `표시 시간대: ${options.timeZone}`,
  ]

  if (events.length === 0) {
    return [
      ...header,
      incomplete ? '확인된 일정이 없습니다.' : '조회 기간에 등록된 일정이 없습니다.',
    ].join('\n')
  }

  return [...header, ...events.map((event) => formatEvent(event, options.timeZone))].join('\n')
}
