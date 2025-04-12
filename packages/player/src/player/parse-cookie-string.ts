/**
 * 쿠키 스트링을 key value 듀블 배열로 반환 합니다
 * @param cookieString
 */
export const parseCookieString = (cookieString: string): [string, string][] => {
  if (!cookieString) {
    return []
  }

  const cookieArray = cookieString.split(';')

  // foreach cookieArray split by '=' and trim and return key value array
  return cookieArray.map((item) => {
    const key = item.split('=')[0].trim()
    const value = item.split('=')[1]?.trim() ?? ''

    return [key, value]
  })
}
