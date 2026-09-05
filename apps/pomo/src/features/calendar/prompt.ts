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

const createDateTimeFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'numeric',
    timeZone,
    year: 'numeric',
  })

const createTimeFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })

const formatParts = (formatter: Intl.DateTimeFormat, date: Date) => {
  const parts = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const dayPeriod = parts.get('dayPeriod')
  const normalizedDayPeriod = dayPeriod === 'PM' || dayPeriod === '오후' ? '오후' : '오전'
  const minute = parts.get('minute')?.padStart(2, '0') ?? '00'
  return {
    day: Number(parts.get('day')),
    hour: Number(parts.get('hour')),
    minute,
    month: Number(parts.get('month')),
    period: normalizedDayPeriod,
    year: Number(parts.get('year')),
  }
}

const formatEventTime = (event: CalendarEvent, timeZone: string) => {
  if (event.allDay) {
    const [year, month, day] = event.start.split('-').map(Number)
    return `${year}. ${month}. ${day}. 종일`
  }

  const start = formatParts(createDateTimeFormatter(timeZone), new Date(event.start))
  const end = formatParts(createTimeFormatter(timeZone), new Date(event.end))
  return (
    `${start.year}. ${start.month}. ${start.day}. ${start.period} ` +
    `${start.hour}:${start.minute}–${end.period} ${end.hour}:${end.minute}`
  )
}

const formatEvent = (event: CalendarEvent, timeZone: string) =>
  `- [${PROVIDER_LABELS[event.provider]} · ${event.accountLabel} · ${event.calendarLabel}] ` +
  `${formatEventTime(event, timeZone)} · ${event.title}`

/** Produces a compact, provider-neutral calendar grounding block for local chat generation. */
export const createCalendarPromptContext = (
  options: CreateCalendarPromptContextOptions,
): string => {
  const header = [
    options.incomplete
      ? '일부 일정만 확인했습니다. 누락 가능성을 알리고, 전체 일정이나 일정이 없다고 단정하지 마세요.'
      : '캘린더 조회 결과입니다. 이 정보에만 근거해 답하고, 일정이 없으면 없다고 말하세요.',
    `표시 시간대: ${options.timeZone}`,
  ]

  if (options.events.length === 0) {
    return [
      ...header,
      options.incomplete ? '확인된 일정이 없습니다.' : '조회 기간에 등록된 일정이 없습니다.',
    ].join('\n')
  }

  return [...header, ...options.events.map((event) => formatEvent(event, options.timeZone))].join(
    '\n',
  )
}
