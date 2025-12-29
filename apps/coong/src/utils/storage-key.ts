/**
 * @description useCookieStorage 를 재 정의해서 키를 일괄 적으로 적용 되도록 해야함
 */
export const getStorageKey = (key: string) => {
  return `coong__${key}`
}
