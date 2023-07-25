import {configure} from 'safe-stable-stringify'

const {parse} = JSON

/**
 * string 을 object 로 파싱 합니다 오류가 나면 defaultValue 를 반환 합니다
 * @param data
 * @param defaultValue
 */
export const jsonParse = (data: string | null, defaultValue: Record<string, any> | null = {}) => {
  if (data === null) {
    return defaultValue
  }
  // 에러 핸들링 해결용
  // eslint-disable-next-line functional/no-try-statements
  try {
    return parse(data)
  } catch {
    return defaultValue
  }
}

export const CIRCULAR = '__CIRCULAR__'
const stringify = configure({
  circularValue: CIRCULAR,
})
/**
 * stringify 시 data 에 문제가 있더라도 에러를 던지지 않고 defaultValue 를 리턴 합니다
 * @param data
 * @param defaultValue
 */
export const jsonStringify = (data: Record<string, any>, defaultValue: string = ''): string => {
  // 에러 던짐 부분 해결
  // eslint-disable-next-line functional/no-try-statements
  try {
    return stringify(data)
  } catch {
    return defaultValue
  }
}
