import {createCalendarExclusionPattern} from './create-calendar-exclusion-pattern'
import {
  type CalendarWeekendIntent,
  createCalendarMonthRange,
  createCalendarPeriodRange,
  createCalendarWeekdayRange,
  DAY_AFTER_TOMORROW_START_DAYS,
  DAYS_PER_WEEK,
  getFirstRequestedDateOffset,
  getLastRequestedDateOffset,
  toRange,
} from './period-range'
import {
  createCalendarWeekdayParser,
  isImplicitWeekdaySchedule,
  type WeekdayIntent,
} from './weekday-expression'
import {dayjs} from 'src/utils/zoned-dayjs'
import type {CalendarEventQuery, CalendarEventRange} from './types'

const CALENDAR_INTENT_PATTERN = /(?:일정|미팅|회의|약속|스케줄)/u
const CALENDAR_PERIOD_PARTICLE_PATTERN =
  /(?:에는|에서|부터|까지|이랑|하고|은|는|이|가|을|를|에|엔|도|로|만|중|쯤|의|과|와|랑)(?=$|[\s,.!?…])/u
const CALENDAR_PERIOD_BOUNDARY_PATTERN = new RegExp(
  `(?=$|[\\s,.!?…]|${CALENDAR_PERIOD_PARTICLE_PATTERN.source})`,
  'u',
)
const CALENDAR_WORD_START_PATTERN = '(?<![\\p{L}\\p{N}_])'
const createCalendarRelativeDayPattern = (phrase: string): RegExp =>
  new RegExp(
    `${CALENDAR_WORD_START_PATTERN}(?:${phrase})${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}`,
    'u',
  )
const THIS_WEEK_PATTERN = new RegExp(`이번 ?주${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}`, 'u')
const THIS_MONTH_PATTERN = new RegExp(`이번 ?달${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}`, 'u')
const NEXT_MONTH_PATTERN = new RegExp(`다음 ?달${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}`, 'u')
const PREVIOUS_MONTH_PATTERN = new RegExp(`지난 ?달${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}`, 'u')
const NEXT_WEEK_TERM_PATTERN = '(?<!다)다음 ?주'
const NEXT_WEEK_TERM_REGEXP = new RegExp(NEXT_WEEK_TERM_PATTERN, 'u')
const {
  getWeekdayIntent,
  weekdayExclusionPattern: WEEKDAY_EXCLUSION_PATTERN,
  weekdayPatternSource: WEEKDAY_PATTERN_SOURCE,
} = createCalendarWeekdayParser({
  calendarIntentPattern: CALENDAR_INTENT_PATTERN,
  calendarPeriodBoundaryPattern: CALENDAR_PERIOD_BOUNDARY_PATTERN,
  calendarWordStartPattern: CALENDAR_WORD_START_PATTERN,
})
const WEEK_AFTER_NEXT_TERM_PATTERN = `${CALENDAR_WORD_START_PATTERN}다다음 ?주`
const PREVIOUS_WEEK_TERM_PATTERN = `${CALENDAR_WORD_START_PATTERN}(?:지난|저번) ?주`
const TWO_WEEKS_AGO_TERM_PATTERN = `${CALENDAR_WORD_START_PATTERN}지지난 ?주`
const createCalendarWeekPattern = (termPattern: string): RegExp =>
  new RegExp(`${termPattern}${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}`, 'u')
const THIS_WEEK_EXCLUSION_PATTERN = createCalendarExclusionPattern('이번 ?주', '다음 ?주')
const NEXT_WEEK_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  NEXT_WEEK_TERM_PATTERN,
  `이번 ?주|\\s*${WEEKDAY_PATTERN_SOURCE}${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}|${WEEK_AFTER_NEXT_TERM_PATTERN}`,
)
const WEEK_AFTER_NEXT_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  WEEK_AFTER_NEXT_TERM_PATTERN,
  `지난 ?주|저번 ?주|이번 ?주|${NEXT_WEEK_TERM_PATTERN}`,
)
const PREVIOUS_WEEK_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  PREVIOUS_WEEK_TERM_PATTERN,
  '이번 ?주|다음 ?주',
)
const TWO_WEEKS_AGO_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  TWO_WEEKS_AGO_TERM_PATTERN,
  '지난 ?주|저번 ?주|이번 ?주|다음 ?주',
)
const THIS_MONTH_EXCLUSION_PATTERN = createCalendarExclusionPattern('이번 ?달', '다음 ?달|지난 ?달')
const NEXT_MONTH_EXCLUSION_PATTERN = createCalendarExclusionPattern('다음 ?달', '이번 ?달|지난 ?달')
const PREVIOUS_MONTH_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  '지난 ?달',
  '이번 ?달|다음 ?달',
)
const NEXT_WEEKEND_PATTERN = /다음 ?주말/u
const PREVIOUS_WEEKEND_PATTERN = /(?:지난|저번) ?주말/u
const WEEKEND_EXCLUSION_PATTERN = createCalendarExclusionPattern('주말(?:은|에)?\\s*')
const WEEKEND_PATTERN = /주말/u
const DAY_BEFORE_YESTERDAY_PHRASE = '(?:엊그제|그저께|그제)'
const DAY_BEFORE_YESTERDAY_PATTERN = createCalendarRelativeDayPattern(DAY_BEFORE_YESTERDAY_PHRASE)
const YESTERDAY_PATTERN = createCalendarRelativeDayPattern('어제')
const TODAY_PATTERN = createCalendarRelativeDayPattern('오늘')
// 날짜 조사가 붙은 '낼로' 등은 앞의 목적격 조사보다 우선하며, '돈을 낼'은 동사로 남긴다.
const TOMORROW_PHRASE = `(?:내일|낼(?=${CALENDAR_PERIOD_PARTICLE_PATTERN.source})|(?<![을를]\\s+)낼)`
const TOMORROW_PATTERN = createCalendarRelativeDayPattern(TOMORROW_PHRASE)
const DAY_AFTER_TOMORROW_PHRASE = '(?:내일)?모레'
const DAY_AFTER_TOMORROW_PATTERN = createCalendarRelativeDayPattern(DAY_AFTER_TOMORROW_PHRASE)
const THREE_DAYS_AHEAD_PATTERN = createCalendarRelativeDayPattern('글피')
const RELATIVE_DAY_PATTERN = createCalendarRelativeDayPattern(
  `(?:${DAY_BEFORE_YESTERDAY_PHRASE}|어제|오늘|${DAY_AFTER_TOMORROW_PHRASE}|${TOMORROW_PHRASE}|글피)`,
)
const CALENDAR_OTHER_PERIOD_TERM_PATTERN = new RegExp(
  `(?:${WEEK_AFTER_NEXT_TERM_PATTERN}${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}|` +
    `${PREVIOUS_WEEK_TERM_PATTERN}${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}|` +
    `${TWO_WEEKS_AGO_TERM_PATTERN}${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}|` +
    `${CALENDAR_WORD_START_PATTERN}(?:이번 ?주|이번 ?달|다음 ?달|지난 ?달)${CALENDAR_PERIOD_BOUNDARY_PATTERN.source}|` +
    `${RELATIVE_DAY_PATTERN.source}|${CALENDAR_WORD_START_PATTERN}주말${CALENDAR_PERIOD_BOUNDARY_PATTERN.source})`,
  'u',
)
const DAY_BEFORE_YESTERDAY_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  DAY_BEFORE_YESTERDAY_PATTERN.source,
  `어제|오늘|${TOMORROW_PHRASE}|모레|글피`,
)
const TODAY_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  TODAY_PATTERN.source,
  TOMORROW_PHRASE,
)
const YESTERDAY_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  YESTERDAY_PATTERN.source,
  `오늘|${TOMORROW_PHRASE}`,
)
const TOMORROW_EXCLUSION_PATTERN = createCalendarExclusionPattern(TOMORROW_PATTERN.source, '오늘')
const DAY_AFTER_TOMORROW_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  DAY_AFTER_TOMORROW_PATTERN.source,
  `오늘|${TOMORROW_PHRASE}`,
)
const THREE_DAYS_AHEAD_EXCLUSION_PATTERN = createCalendarExclusionPattern(
  THREE_DAYS_AHEAD_PATTERN.source,
  `그저께|그제|어제|오늘|${TOMORROW_PHRASE}|모레`,
)
const NEXT_WEEK_PATTERN = createCalendarWeekPattern(
  `${NEXT_WEEK_TERM_PATTERN}(?:\\s*${WEEKDAY_PATTERN_SOURCE})?`,
)
const WEEK_AFTER_NEXT_PATTERN = createCalendarWeekPattern(WEEK_AFTER_NEXT_TERM_PATTERN)
const PREVIOUS_WEEK_PATTERN = createCalendarWeekPattern(PREVIOUS_WEEK_TERM_PATTERN)
const TWO_WEEKS_AGO_PATTERN = createCalendarWeekPattern(TWO_WEEKS_AGO_TERM_PATTERN)
const IMPLICIT_SCHEDULE_PATTERN = new RegExp(
  `(?:${RELATIVE_DAY_PATTERN.source}|${THIS_WEEK_PATTERN.source}|${NEXT_WEEK_PATTERN.source}|` +
    `${WEEK_AFTER_NEXT_PATTERN.source}|${PREVIOUS_WEEK_PATTERN.source}|${TWO_WEEKS_AGO_PATTERN.source}|` +
    `${THIS_MONTH_PATTERN.source}|${NEXT_MONTH_PATTERN.source}|` +
    `${PREVIOUS_MONTH_PATTERN.source}|주말)` +
    `(?:\\s*(?:에는|에|엔|은|는|도))?` +
    `(?:\\s*(?:새벽|아침|오전|점심|오후|저녁|밤|낮|정오))?` +
    `(?:\\s*(?:에는|에|엔|은|는|도))?\\s*` +
    `(?:뭐|무엇|무슨\\s+일)(?:가|이|은|는)?\\s*(?:있|하)`,
  'u',
)
const MILLISECONDS_PER_DAY = 86_400_000
const DAY_BEFORE_YESTERDAY_START_DAYS = -2
const THREE_DAYS_AHEAD_START_DAYS = 3
const NEXT_EVENT_WINDOW_DAYS = 30

// 승인된 사용자 현지 시각 범위: 새벽 00–06, 아침 06–10, 점심 11–14, 낮 09–18, 저녁 18–21, 밤 21–24.
// 아침·낮·점심의 자연스러운 겹침은 의도했습니다.
// 정오는 구간이 아니라 정확한 시점이며, 그 시각에 시작하거나 그 시각에도 진행 중인 일정만 포함합니다.
// 시간대 표현은 기본적으로 전체 구간을 조회하고, '남은 일정'만 현재 시각부터 자릅니다.
// 남은 구간이 끝났으면 다음 날로 넘기지 않고 빈 결과를 나타냅니다.
const CALENDAR_DAYPART_WINDOWS = [
  {end: '06:00:00', endDayOffset: 0, name: '새벽', start: '00:00:00'},
  {end: '10:00:00', endDayOffset: 0, name: '아침', start: '06:00:00'},
  {end: '14:00:00', endDayOffset: 0, name: '점심', start: '11:00:00'},
  {end: '18:00:00', endDayOffset: 0, name: '낮', start: '09:00:00'},
  {end: '21:00:00', endDayOffset: 0, name: '저녁', start: '18:00:00'},
  {end: '00:00:00', endDayOffset: 1, name: '밤', start: '21:00:00'},
] as const
const REMAINING_SCHEDULE_PATTERN = /남은\s*(?:일정|미팅|회의|약속|스케줄)/u
const CALENDAR_DAYPART_NAMES = ['정오', ...CALENDAR_DAYPART_WINDOWS.map(({name}) => name)]

const includesUnexcludedCalendarDaypart = (text: string, name: string) =>
  text.includes(name) &&
  !createCalendarExclusionPattern(
    name,
    CALENDAR_DAYPART_NAMES.filter((daypart) => daypart !== name).join('|'),
  ).test(text)

const includesUnexcludedPhrase = (
  text: string,
  phrasePattern: RegExp,
  exclusionPattern: RegExp,
): boolean => phrasePattern.test(text) && !exclusionPattern.test(text)
interface RequestedNextWeekdayIntent extends WeekdayIntent {
  readonly hasOtherPeriod: boolean
}

const getRequestedNextWeekdayIntent = (text: string): RequestedNextWeekdayIntent => {
  const nextWeekMatch = NEXT_WEEK_TERM_REGEXP.exec(text)
  if (nextWeekMatch === null) {
    return {hasExcludedWeekday: false, hasOtherPeriod: false, offsets: []}
  }

  const followingText = text.slice(nextWeekMatch.index + nextWeekMatch[0].length)
  const nextPeriodMatch = CALENDAR_OTHER_PERIOD_TERM_PATTERN.exec(followingText)
  const nextWeekClause =
    nextPeriodMatch === null ? followingText : followingText.slice(0, nextPeriodMatch.index)
  return {
    ...getWeekdayIntent(nextWeekClause),
    hasOtherPeriod: CALENDAR_OTHER_PERIOD_TERM_PATTERN.test(text),
  }
}

const includesRequestedNextWeek = (
  text: string,
  requestedWeekdayIntent: RequestedNextWeekdayIntent,
): boolean =>
  NEXT_WEEK_PATTERN.test(text) &&
  !NEXT_WEEK_EXCLUSION_PATTERN.test(text) &&
  !(
    requestedWeekdayIntent.hasOtherPeriod &&
    requestedWeekdayIntent.hasExcludedWeekday &&
    requestedWeekdayIntent.offsets.length === 0
  )

const isStandaloneDateRequest = (includesDate: boolean, includesThisWeek: boolean): boolean =>
  includesDate && !includesThisWeek
const getCalendarWeekendIntent = (text: string): CalendarWeekendIntent | null => {
  if (!WEEKEND_PATTERN.test(text) || WEEKEND_EXCLUSION_PATTERN.test(text)) {
    return null
  }

  if (PREVIOUS_WEEKEND_PATTERN.test(text)) {
    return 'previous'
  }

  return NEXT_WEEKEND_PATTERN.test(text) ? 'next' : 'upcoming'
}

interface CreateCalendarQueryOptions {
  readonly now?: Date
  readonly text: string
  readonly timeZone?: string
}

interface CalendarQueryIntent {
  readonly includesNextWeek: boolean
  readonly includesPreviousWeek: boolean
  readonly includesThisWeek: boolean
  readonly includesTwoWeeksAgo: boolean
  readonly includesWeekAfterNext: boolean
  readonly monthOffsets: ReadonlyArray<number>
  readonly relativeDayOffsets: ReadonlyArray<number>
  readonly requestedWeekdayOffsets: ReadonlyArray<number>
  readonly weekendIntent: CalendarWeekendIntent | null
}

interface CreateCalendarDateRangeOptions {
  readonly afternoonStart: Date
  readonly daypartQuery: CalendarEventQuery | null
  readonly end: Date
  readonly morningEnd: Date
  readonly now: Date
  readonly start: Date
  readonly text: string
}

interface CreateStandaloneCalendarDateRangeOptions {
  readonly boundary: (days: number, time?: string) => Date
  readonly includesNextWeek: boolean
  readonly includesPreviousWeek: boolean
  readonly includesThisWeek: boolean
  readonly includesTwoWeeksAgo: boolean
  readonly includesWeekAfterNext: boolean
  readonly now: Date
  readonly relativeDayOffsets: ReadonlyArray<number>
  readonly text: string
}

const getCalendarQueryIntent = (text: string): CalendarQueryIntent => {
  const requestedNextWeekdayIntent = getRequestedNextWeekdayIntent(text)
  return {
    includesNextWeek: includesRequestedNextWeek(text, requestedNextWeekdayIntent),
    includesPreviousWeek:
      PREVIOUS_WEEK_PATTERN.test(text) && !PREVIOUS_WEEK_EXCLUSION_PATTERN.test(text),
    includesThisWeek: THIS_WEEK_PATTERN.test(text) && !THIS_WEEK_EXCLUSION_PATTERN.test(text),
    includesTwoWeeksAgo:
      TWO_WEEKS_AGO_PATTERN.test(text) && !TWO_WEEKS_AGO_EXCLUSION_PATTERN.test(text),
    includesWeekAfterNext:
      WEEK_AFTER_NEXT_PATTERN.test(text) && !WEEK_AFTER_NEXT_EXCLUSION_PATTERN.test(text),
    monthOffsets: [
      ...(PREVIOUS_MONTH_PATTERN.test(text) && !PREVIOUS_MONTH_EXCLUSION_PATTERN.test(text)
        ? [-1]
        : []),
      ...(THIS_MONTH_PATTERN.test(text) && !THIS_MONTH_EXCLUSION_PATTERN.test(text) ? [0] : []),
      ...(NEXT_MONTH_PATTERN.test(text) && !NEXT_MONTH_EXCLUSION_PATTERN.test(text) ? [1] : []),
    ],
    relativeDayOffsets: [
      ...(includesUnexcludedPhrase(
        text,
        DAY_BEFORE_YESTERDAY_PATTERN,
        DAY_BEFORE_YESTERDAY_EXCLUSION_PATTERN,
      )
        ? [DAY_BEFORE_YESTERDAY_START_DAYS]
        : []),
      ...(includesUnexcludedPhrase(text, YESTERDAY_PATTERN, YESTERDAY_EXCLUSION_PATTERN)
        ? [-1]
        : []),
      ...(includesUnexcludedPhrase(text, TODAY_PATTERN, TODAY_EXCLUSION_PATTERN) ? [0] : []),
      ...(includesUnexcludedPhrase(text, TOMORROW_PATTERN, TOMORROW_EXCLUSION_PATTERN) ? [1] : []),
      ...(includesUnexcludedPhrase(
        text,
        DAY_AFTER_TOMORROW_PATTERN,
        DAY_AFTER_TOMORROW_EXCLUSION_PATTERN,
      )
        ? [DAY_AFTER_TOMORROW_START_DAYS]
        : []),
      ...(includesUnexcludedPhrase(
        text,
        THREE_DAYS_AHEAD_PATTERN,
        THREE_DAYS_AHEAD_EXCLUSION_PATTERN,
      )
        ? [THREE_DAYS_AHEAD_START_DAYS]
        : []),
    ],
    requestedWeekdayOffsets: requestedNextWeekdayIntent.offsets,
    weekendIntent: getCalendarWeekendIntent(text),
  }
}

const createCalendarDaypartQuery = ({
  boundary,
  dayOffset,
  now,
  text,
}: {
  readonly boundary: (days: number, time?: string) => Date
  readonly dayOffset: number
  readonly now: Date
  readonly text: string
}): CalendarEventQuery | null => {
  if (includesUnexcludedCalendarDaypart(text, '정오')) {
    return {at: boundary(dayOffset, '12:00:00').toISOString()}
  }

  const window = CALENDAR_DAYPART_WINDOWS.find(({name}) =>
    includesUnexcludedCalendarDaypart(text, name),
  )
  if (window === undefined) {
    return null
  }

  const start = boundary(dayOffset, window.start)
  const end = boundary(dayOffset + window.endDayOffset, window.end)
  if (!REMAINING_SCHEDULE_PATTERN.test(text)) {
    return toRange(start, end)
  }

  const remainingStart = now.getTime() > start.getTime() ? now : start
  return remainingStart.getTime() >= end.getTime() ? {empty: true} : toRange(remainingStart, end)
}

const createCalendarDateRange = ({
  afternoonStart,
  daypartQuery,
  end,
  morningEnd,
  now,
  start,
  text,
}: CreateCalendarDateRangeOptions): CalendarEventQuery => {
  if (text.includes('오전')) {
    return toRange(start, morningEnd)
  }

  if (text.includes('오후')) {
    const afternoonRangeStart =
      now.getTime() < afternoonStart.getTime() || now.getTime() >= end.getTime()
        ? afternoonStart
        : now
    return toRange(afternoonRangeStart, end)
  }

  if (daypartQuery !== null) {
    return daypartQuery
  }

  return toRange(start, end)
}

const createStandaloneCalendarDateRange = ({
  boundary,
  includesNextWeek,
  includesPreviousWeek,
  includesThisWeek,
  includesTwoWeeksAgo,
  includesWeekAfterNext,
  now,
  relativeDayOffsets,
  text,
}: CreateStandaloneCalendarDateRangeOptions): CalendarEventQuery | null => {
  if (includesPreviousWeek || includesTwoWeeksAgo) {
    return null
  }

  const includesExtendedRelativeDate = relativeDayOffsets.some(
    (offset) => offset < -1 || offset > 1,
  )
  if (isStandaloneDateRequest(includesExtendedRelativeDate, includesThisWeek)) {
    const startDayOffset = getFirstRequestedDateOffset(relativeDayOffsets)
    const endDayOffset = getLastRequestedDateOffset(relativeDayOffsets)
    const includesToday = relativeDayOffsets.includes(0)
    const start = includesToday && startDayOffset === 0 ? now : boundary(startDayOffset)
    const noon = boundary(endDayOffset, '12:00:00')
    const daypartQuery =
      relativeDayOffsets.length === 1
        ? createCalendarDaypartQuery({boundary, dayOffset: startDayOffset, now, text})
        : null
    return createCalendarDateRange({
      afternoonStart: boundary(startDayOffset, '12:00:00'),
      daypartQuery,
      end: boundary(endDayOffset + 1),
      morningEnd: noon,
      now,
      start,
      text,
    })
  }

  if (isStandaloneDateRequest(relativeDayOffsets.includes(1), includesThisWeek)) {
    const start = relativeDayOffsets.includes(0) ? now : boundary(1)
    const noon = boundary(1, '12:00:00')
    const daypartQuery =
      relativeDayOffsets.length === 1
        ? createCalendarDaypartQuery({boundary, dayOffset: 1, now, text})
        : null
    return createCalendarDateRange({
      afternoonStart: relativeDayOffsets.includes(0) ? boundary(0, '12:00:00') : noon,
      daypartQuery,
      end: boundary(2),
      morningEnd: noon,
      now,
      start: relativeDayOffsets.includes(-1) ? boundary(-1) : start,
      text,
    })
  }

  if (
    relativeDayOffsets.includes(0) &&
    !includesThisWeek &&
    !includesNextWeek &&
    !includesWeekAfterNext
  ) {
    const end = boundary(1)
    const noon = boundary(0, '12:00:00')
    const hasPassedNoon = now.getTime() >= noon.getTime()
    const start = relativeDayOffsets.includes(-1)
      ? boundary(-1)
      : text.includes('오전') && hasPassedNoon
        ? boundary(0)
        : now
    const daypartQuery =
      relativeDayOffsets.length === 1
        ? createCalendarDaypartQuery({boundary, dayOffset: 0, now, text})
        : null
    return createCalendarDateRange({
      afternoonStart: noon,
      daypartQuery,
      end,
      morningEnd: noon,
      now,
      start,
      text,
    })
  }

  return null
}

const createStandaloneCalendarWeekdayRange = ({
  boundary,
  currentWeekday,
  now,
  text,
  weekdays,
}: {
  readonly boundary: (days: number, time?: string) => Date
  readonly currentWeekday: number
  readonly now: Date
  readonly text: string
  readonly weekdays: ReadonlyArray<number>
}): CalendarEventQuery | null => {
  const calendarRange = createCalendarWeekdayRange({
    boundary,
    currentWeekday,
    weekdayOffsets: weekdays,
  })
  if (calendarRange === null) {
    return null
  }

  const {end, firstDayOffset, lastDayOffset} = calendarRange
  const morningEnd = boundary(lastDayOffset, '12:00:00')
  const isPastSameDayMorning =
    firstDayOffset === 0 &&
    text.includes('오전') &&
    now.getTime() >= boundary(0, '12:00:00').getTime()
  const start = firstDayOffset === 0 && !isPastSameDayMorning ? now : boundary(firstDayOffset)
  const daypartQuery =
    weekdays.length === 1
      ? createCalendarDaypartQuery({boundary, dayOffset: firstDayOffset, now, text})
      : null

  return createCalendarDateRange({
    afternoonStart: boundary(firstDayOffset, '12:00:00'),
    daypartQuery,
    end,
    morningEnd,
    now,
    start,
    text,
  })
}

const hasCalendarQueryIntent = (text: string) =>
  CALENDAR_INTENT_PATTERN.test(text) ||
  IMPLICIT_SCHEDULE_PATTERN.test(text) ||
  isImplicitWeekdaySchedule(text)

/** Resolves a calendar lookup in the requested time zone. */
export const createCalendarQuery = (
  options: CreateCalendarQueryOptions,
): CalendarEventQuery | null => {
  if (!hasCalendarQueryIntent(options.text)) {
    return null
  }

  const now = options.now ?? new Date()
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const local = dayjs(now).tz(timeZone)
  // Reparse each calendar boundary so DST offsets belong to that date, not to today.
  const boundary = (days: number, time = '00:00:00') => {
    const date = dayjs.utc(local.format('YYYY-MM-DD')).add(days, 'day').format('YYYY-MM-DD')
    return dayjs.tz(`${date}T${time}`, timeZone).toDate()
  }

  if (isImplicitWeekdaySchedule(options.text)) {
    return createStandaloneCalendarWeekdayRange({
      boundary,
      currentWeekday: local.day(),
      now,
      text: options.text,
      weekdays: getWeekdayIntent(options.text).offsets,
    })
  }

  const {
    includesNextWeek,
    includesPreviousWeek,
    includesThisWeek,
    includesTwoWeeksAgo,
    includesWeekAfterNext,
    monthOffsets,
    relativeDayOffsets,
    requestedWeekdayOffsets,
    weekendIntent,
  } = getCalendarQueryIntent(options.text)
  const standaloneDateRange = createStandaloneCalendarDateRange({
    boundary,
    includesNextWeek,
    includesPreviousWeek,
    includesThisWeek,
    includesTwoWeeksAgo,
    includesWeekAfterNext,
    now,
    relativeDayOffsets,
    text: options.text,
  })
  const weekday = local.day()
  const daysUntilNextMonday = weekday === 0 ? 1 : DAYS_PER_WEEK + 1 - weekday
  const weekRange = createCalendarPeriodRange({
    boundary,
    daysUntilNextMonday,
    includesNextWeek,
    includesPreviousWeek,
    includesThisWeek,
    includesTwoWeeksAgo,
    includesWeekAfterNext,
    now,
    relativeDayOffsets,
    requestedWeekdayOffsets,
    weekday,
    weekendIntent,
  })
  const monthBoundary = (months: number) => {
    const date = dayjs.utc(local.format('YYYY-MM-01')).add(months, 'month').format('YYYY-MM-DD')
    return dayjs.tz(`${date}T00:00:00`, timeZone).toDate()
  }
  const monthRange = createCalendarMonthRange({boundary: monthBoundary, monthOffsets, now})
  if (monthRange !== null) {
    return monthRange
  }
  if (standaloneDateRange !== null) {
    return standaloneDateRange
  }
  if (weekRange !== null) {
    return weekRange
  }
  if (relativeDayOffsets.includes(-1)) {
    return toRange(boundary(-1), boundary(0))
  }
  return toRange(now, new Date(now.getTime() + NEXT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY))
}
