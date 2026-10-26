import {z} from 'zod'

const ISO_DATE_LENGTH = 10
const isoDateSchema = z.iso.date()

/** 존재하지 않는 날짜를 보정하지 않고 ISO 달력 날짜 접두부를 검사한다. */
export const hasValidIsoCalendarDate = (value: string): boolean =>
  isoDateSchema.safeParse(value.slice(0, ISO_DATE_LENGTH)).success
