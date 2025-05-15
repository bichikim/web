/**
 * change keys of an object
 * @param value 타켓 데이터
 * @param transform 리턴 값으로 키가 변경 됩니다
 * @param deep 얼마나 깊게 탐색에서 키를 변결 할지 -1 는 무제한 입니다
 */
export const changeKeys = <T>(value: T, transform: (value: keyof any) => keyof any, deep: number = -1): T => {
  const isEnterDeeply = deep > 0 || deep < 0

  if (typeof value !== 'object' || value === null || !isEnterDeeply) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      return changeKeys(item, transform, deep - 1)
    }) as any
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const newKey = transform(key)

      const newItem = typeof item === 'object' ? changeKeys(item, transform, deep - 1) : item

      return [newKey, newItem]
    }),
  ) as any
}

export interface ChangeKeysRight {
  (transform: (value: keyof any) => keyof any, deep?: number): <T>(value: T) => T

  <T>(transform: (value: keyof any) => keyof any, deep: number, value: T): T
}

export const changeKeysRight: ChangeKeysRight = (...args: any[]) => {
  const [transform, deep, value] = args

  if (args.length > 2) {
    return changeKeys(value, transform, deep)
  }

  return (value) => {
    return changeKeys(value, transform, deep)
  }
}
