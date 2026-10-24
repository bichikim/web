/** 값이 null과 배열을 제외한 객체인지 반환한다. */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
