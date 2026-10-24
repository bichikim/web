const formatters = new Map<string, Intl.DateTimeFormat>()

/** 요청한 로케일의 medium 날짜 형식과 short 시간 형식으로 타임스탬프를 표시한다. */
export const formatMediumDateTime = (value: string, locale: string): string => {
  let formatter = formatters.get(locale)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'})
    formatters.set(locale, formatter)
  }
  return formatter.format(new Date(value))
}
