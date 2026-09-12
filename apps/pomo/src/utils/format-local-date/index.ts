import dayjs from 'dayjs'

/** Formats a Date as YYYY-MM-DD in the local time zone. */
export const formatLocalDate = (date: Date): string => dayjs(date).format('YYYY-MM-DD')
