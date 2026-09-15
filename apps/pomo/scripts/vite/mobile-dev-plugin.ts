import type {Plugin} from 'vite'

const isJsonImportRequest = (url: string) => {
  const queryStart = url.indexOf('?')
  return (
    queryStart >= 0 &&
    url.slice(0, queryStart).endsWith('.json') &&
    new URLSearchParams(url.slice(queryStart + 1)).has('import')
  )
}

export const createMobileDevPlugin = (isMobileRuntime: boolean): Plugin => ({
  configureServer(server) {
    if (!isMobileRuntime) {
      return
    }

    // Nitro otherwise routes JSON module imports to the application's HTML 404 page.
    server.middlewares.use(async (request, response, next) => {
      const {url} = request
      if (url === undefined || !isJsonImportRequest(url)) {
        next()
        return
      }

      try {
        const result = await server.transformRequest(url)
        if (result === null) {
          next()
          return
        }

        response.statusCode = 200
        response.setHeader('Content-Type', 'text/javascript')
        response.end(result.code)
      } catch (error) {
        next(error)
      }
    })
  },
  enforce: 'pre',
  name: 'pomo:mobile-dev',
})
