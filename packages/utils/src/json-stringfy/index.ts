const {stringify} = JSON

/**
 * stringify 시 data 에 문제가 있더라도 에러를 던지지 않고 defaultValue 를 리턴 합니다
 * @param data
 * @param defaultValue
 */
export const jsonStringify = (data: Record<string, any>, defaultValue: string = ''): string => {
  try {
    return stringify(data)
  } catch {
    return defaultValue
  }
}
