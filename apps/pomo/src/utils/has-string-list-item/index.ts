import {parseCommaSeparated} from '../parse-comma-separated'

/** 쉼표로 나눈 각 항목의 양쪽 공백을 제거한 뒤, 원하는 항목이 포함되어 있는지 반환한다. */
export const hasStringListItem = (values: string, expected: string): boolean =>
  parseCommaSeparated(values).includes(expected)
