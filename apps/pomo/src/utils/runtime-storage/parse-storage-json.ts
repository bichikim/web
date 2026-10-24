import type {ParseStoredValue} from './types'

/** 앞쪽 BOM 하나를 제거하고 JSON을 파싱하며, 누락되거나 형식이 잘못되었거나 유효하지 않은 데이터는 null로 통일한다. */
export const parseStorageJson = <Value>(
  storedValue: string | null,
  parseValue: ParseStoredValue<Value>,
): Value | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const json = storedValue.replace(/^\uFEFF/u, '')
    return parseValue(JSON.parse(json) as unknown)
  } catch {
    return null
  }
}
