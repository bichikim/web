import {dayjs} from 'src/utils/zoned-dayjs'

const KOREA_OFFSET_HOURS = 9

export const koreanToday = (now: Date): string =>
  dayjs(now).utcOffset(KOREA_OFFSET_HOURS).format('YYYY-MM-DD')
