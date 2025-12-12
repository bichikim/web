import {createMiddleware} from '@solidjs/start/middleware'
import {createSupabaseServer} from 'src/utils/supabase'
import {queryClient} from 'src/utils/query'

const checkPublicRoute = (pathname: string) => {
  if (pathname === '/') {
    return true
  }

  return /\/public\//u.test(pathname)
}

const LoginPath = '/public/login'

export default createMiddleware({
  onRequest: [
    async (event) => {
      // Skip static assets and internal routes
      const url = new URL(event.request.url)
      const headers = event.request.headers

      const pathname = url.pathname

      if (url.pathname.startsWith('/_') || url.pathname.includes('.')) {
        return
      }
      const isPublic = checkPublicRoute(pathname)
      const supabase = createSupabaseServer(event)

      const {
        data: {user},
      } = await supabase.auth.getUser()

      // Store user in query client for reuse
      queryClient.setQueryData(['auth'], user)

      if (isPublic) {
        return
      }

      if (!user) {
        return Response.redirect(new URL(LoginPath, event.request.url))
      }
    },
  ],
})
