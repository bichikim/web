/** 존재하지 않는 날짜를 보정하지 않고 ISO 달력 날짜 접두부를 검사한다. */
export const hasValidIsoCalendarDate = (value: string): boolean => {
  const prefix = /^\d{4}-\d{2}-\d{2}/u.exec(value)?.[0]
  if (prefix === undefined) {
    return false
  }
  const timestamp = Date.parse(prefix)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(prefix)
}
