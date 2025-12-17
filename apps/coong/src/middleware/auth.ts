import {createMiddlewareFragment} from 'src/utils/middleware-helper'
import {userQuery} from 'src/requests/user'

const checkPublicRoute = (pathname: string) => {
  if (pathname === '/') {
    return true
  }

  return /\/public\//u.test(pathname)
}

const LoginPath = '/public/sign-in'

export const authMiddleware = createMiddlewareFragment({
  onRequest: [
    async (event) => {
      // Skip static assets and internal routes
      const url = new URL(event.request.url)

      const pathname = url.pathname

      if (url.pathname.startsWith('/_') || url.pathname.includes('.')) {
        return
      }

      const isPublic = checkPublicRoute(pathname)

      /**
       * solidjs query 는 5초 미만 캐시가 일어나기 때문에 매번 요청을 하여도 상관 없습니다
       */
      const user = await userQuery()

      if (isPublic) {
        return
      }

      // if (!user) {
      //   return Response.redirect(new URL(LoginPath, event.request.url))
      // }
    },
  ],
})
