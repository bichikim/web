import {setCookieItem} from '@winter-love/utils'
import {parseCookieString} from './parse-cookie-string'

/**
 * 스트링 형태의 쿠키 정보를 브라우저에 쿠키정보로 업데이트 합니다
 * 웨이브 비디오 재생 인증용으로 사용 됩니다
 * @param cookieString
 */
export const updateCookies = (cookieString?: string) => {
  if (!cookieString) {
    return
  }

  const cookieList = parseCookieString(cookieString)

  for (const [key, value] of cookieList) {
    setCookieItem(key, value, {}, true)
  }
}
