import {ApiJsonError} from '../api-json'
import {parseDate} from '../civil-date'
import {dayjs} from 'src/utils/zoned-dayjs'
import {isValidTimeZone} from 'src/utils/is-valid-time-zone'
import {calendarToolCallSchema} from './agent-tool-contract'
import {listCalendarEvents} from './client'
import {formatCalendarEventList} from './prompt'
import {type CalendarEventLookup, MAXIMUM_CALENDAR_RANGE_MILLISECONDS} from './types'

const LOCAL_MINUTE_FORMAT = 'YYYY-MM-DDTHH:mm'
const LOCAL_MINUTE = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/u
const MAXIMUM_EVENTS = 40
const MAXIMUM_EVENT_LABEL_LENGTH = 160
const HTTP_UNAUTHORIZED = 401

const parseLocalMinute = (text: string, timeZone: string): Date | null => {
  if (!LOCAL_MINUTE.test(text) || parseDate(text.split('T')[0] ?? '') === null) {
    return null
  }
  const localTime = dayjs.tz(text, timeZone)
  return localTime.format(LOCAL_MINUTE_FORMAT) === text ? localTime.toDate() : null
}

export const resolveCalendarToolLookup = (
  input: unknown,
  timeZone: string,
): CalendarEventLookup | null => {
  const result = calendarToolCallSchema.safeParse(input)
  if (!result.success || result.data.name !== 'calendar_lookup' || !isValidTimeZone(timeZone)) {
    return null
  }
  const {at, end, start} = result.data
  if (at.length > 0) {
    const time = parseLocalMinute(at, timeZone)
    return time !== null && start === '' && end === '' ? {at: time.toISOString()} : null
  }

  const from = parseLocalMinute(start, timeZone)
  const to = parseLocalMinute(end, timeZone)
  if (from === null || to === null) {
    return null
  }
  const duration = to.getTime() - from.getTime()
  return duration > 0 && duration <= MAXIMUM_CALENDAR_RANGE_MILLISECONDS
    ? {end: to.toISOString(), start: from.toISOString()}
    : null
}

/** Runs one validated read using the current account and the application time zone. */
export const executeCalendarTool = async (
  input: unknown,
  timeZone: string,
  signal: AbortSignal,
): Promise<string> => {
  const lookup = resolveCalendarToolLookup(input, timeZone)
  if (lookup === null) {
    return '어느 날짜와 시간대의 일정을 확인할까요?'
  }
  try {
    signal.throwIfAborted()
    const result = await listCalendarEvents({...lookup, timeZone}, signal)
    signal.throwIfAborted()
    if (result.connectedConnections === 0) {
      return '일정을 확인하려면 캘린더를 연결해 주세요.'
    }

    const events = result.events.slice(0, MAXIMUM_EVENTS).map((event) => ({
      ...event,
      accountLabel: event.accountLabel.slice(0, MAXIMUM_EVENT_LABEL_LENGTH),
      calendarLabel: event.calendarLabel.slice(0, MAXIMUM_EVENT_LABEL_LENGTH),
      title: event.title.slice(0, MAXIMUM_EVENT_LABEL_LENGTH),
    }))
    const formatted = formatCalendarEventList(events, timeZone)
    const incomplete =
      result.truncated ||
      result.unavailableConnections > 0 ||
      formatted.length < result.events.length
    if (formatted.length === 0) {
      return incomplete
        ? '캘린더 일부를 확인하지 못했습니다.'
        : '조회한 시간에 등록된 일정이 없습니다.'
    }
    if (incomplete) {
      formatted.push('캘린더 일부를 확인하지 못해 일정이 빠져 있을 수 있습니다.')
    }

    return formatted.join('\n')
  } catch (error: unknown) {
    signal.throwIfAborted()
    if (error instanceof ApiJsonError && error.response.status === HTTP_UNAUTHORIZED) {
      return '일정을 확인하려면 로그인해 주세요.'
    }

    return '캘린더 일정을 조회하지 못했습니다.'
  }
}
