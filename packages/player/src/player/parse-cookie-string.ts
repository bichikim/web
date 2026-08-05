/**
 * 쿠키 스트링을 key value 듀블 배열로 반환 합니다
 * @param cookieString
 */
export const parseCookieString = (cookieString: string): [string, string][] => {
  if (!cookieString) {
    return []
  }

  return cookieString.split(';').map((item) => {
    const separatorIndex = item.indexOf('=')
    const key = (separatorIndex === -1 ? item : item.slice(0, separatorIndex)).trim()
    const value = (separatorIndex === -1 ? '' : item.slice(separatorIndex + 1)).trim()

    return [key, value]
  })
}
