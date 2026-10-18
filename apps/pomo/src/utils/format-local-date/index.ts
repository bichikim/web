import dayjs from 'dayjs'

/** 로컬 시간대를 기준으로 Date를 YYYY-MM-DD 형식으로 표시한다. */
export const formatLocalDate = (date: Date): string => dayjs(date).format('YYYY-MM-DD')
