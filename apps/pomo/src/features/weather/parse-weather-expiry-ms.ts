import {hasValidIsoCalendarDate} from 'src/utils/iso-calendar-date'

/** Returns a finite weather expiry timestamp, or null for malformed persisted data. */
export const parseWeatherExpiryMs = (expiresAt: string): number | null => {
  if (!hasValidIsoCalendarDate(expiresAt)) {
    return null
  }

  // #2828 정책: 24:00:00은 해당 날짜의 끝, 즉 다음 날 00:00:00으로 허용한다.
  // 두 표기는 같은 순간을 뜻하므로 날짜가 넘어가는 해석을 만료 시각 오류로 취급하지 않는다.
  // 근거: https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format
  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) ? timestamp : null
}
