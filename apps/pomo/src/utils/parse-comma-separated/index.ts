import {splitCommaSeparated} from '../split-comma-separated'
import {filter, map, pipe} from 'es-toolkit/fp'

/** 쉼표로 나누고 각 항목의 양쪽 공백과 빈 항목을 제거한다. */
export const parseCommaSeparated = (values: string): string[] =>
  pipe(
    splitCommaSeparated(values),
    map((value) => value.trim()),
    filter((value) => value.length > 0),
  )
