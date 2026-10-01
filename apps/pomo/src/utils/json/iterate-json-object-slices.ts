import {findJsonObjectEnd} from './find-json-object-end'
export interface JsonObjectSlice {
  readonly end: number
  readonly slice: string
  readonly start: number
}
/** Iterates complete object candidates, including nested objects unless the caller skips their range. */
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
