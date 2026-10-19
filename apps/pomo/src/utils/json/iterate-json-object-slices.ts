import {findJsonObjectEnd} from './find-json-object-end'
export interface JsonObjectSlice {
  readonly end: number
  readonly slice: string
  readonly start: number
}
/** 완전한 객체 후보를 순회하며, 호출자가 범위를 건너뛰지 않으면 중첩 객체도 포함한다. */
export function* iterateJsonObjectSlices(
  text: string,
): Generator<JsonObjectSlice, void, number | undefined> {
  let start = text.indexOf('{')
  while (start >= 0) {
    const end = findJsonObjectEnd(text, start)
    const next = end > start ? yield {end, slice: text.slice(start, end + 1), start} : undefined
    start = text.indexOf('{', next ?? start + 1)
  }
}
