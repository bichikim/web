const formatters = new Map<string, Intl.DateTimeFormat>()

/** Formats a timestamp with medium date and short time in the requested locale. */
export const formatMediumDateTime = (value: string, locale: string): string => {
  let formatter = formatters.get(locale)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'})
    formatters.set(locale, formatter)
  }
  return formatter.format(new Date(value))
}
