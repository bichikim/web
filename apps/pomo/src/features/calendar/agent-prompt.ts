import {dayjs} from 'src/utils/zoned-dayjs'
import type {CalendarToolClock} from './agent-tool-contract'

const SATURDAY = 6
const DAYS_PER_WEEK = 7

export const CALENDAR_TOOL_FORMAT =
  '{"name":"calendar_lookup","start":"YYYY-MM-DDTHH:mm","end":"YYYY-MM-DDTHH:mm","at":""}'

/** Gives the model the user's civil date boundaries without interpreting their message. */
export const createCalendarToolInstruction = (clock: CalendarToolClock): string => {
  const local = dayjs(clock.now).tz(clock.timeZone)
  const date = (offset: number) => local.add(offset, 'day').format('YYYY-MM-DD')
  const weekday = local.day()
  const currentWeekend = weekday === 0 ? -1 : SATURDAY - weekday
  const nextWeekend = currentWeekend + DAYS_PER_WEEK
  return `캘린더 읽기 도구 calendar_lookup을 사용할 수 있습니다.
사용자 시간대는 ${clock.timeZone}, 현재 시각은 ${local.format('YYYY-MM-DD HH:mm')}입니다.
오늘은 ${date(0)}, 내일은 ${date(1)}, 모레는 ${date(2)}입니다.
이번 주말은 ${date(currentWeekend)} 토요일부터 ${date(currentWeekend + 2)} 월요일 00:00 전까지입니다.
다음 주말은 ${date(nextWeekend)} 토요일부터 ${date(nextWeekend + 2)} 월요일 00:00 전까지입니다.
마지막 사용자가 실제 일정 조회를 원할 때만 도구를 호출하세요. 일정 문장 번역이나 일반 질문에는 호출하지 마세요.
조회 범위를 결정할 때 제외한 날짜나 시간을 빼고 남은 범위만 전달하세요.
예를 들어 내일 오전을 제외하면 ${date(1)}T12:00부터 ${date(2)}T00:00 전까지 조회하세요.
내일 오후를 제외하고 오전을 물으면 ${date(1)}T00:00부터 ${date(1)}T12:00 전까지 조회하세요.
이번 주말을 제외하고 주말을 물으면 ${date(nextWeekend)}T00:00부터 ${date(nextWeekend + 2)}T00:00 전까지 조회하세요.
조회 범위는 사용자 현지 시간으로 시작 포함·끝 제외입니다. 한 시각의 일정을 조회할 때는 at만 채우고 start와 end는 빈 문자열로 두세요.
범위가 불명확하거나 하나의 연속된 범위로 표현할 수 없으면 조회하지 말고 사용자에게 필요한 범위를 물으세요. 도구 결과 없이 일정을 지어내지 마세요.`
}
