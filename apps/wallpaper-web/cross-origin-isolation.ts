import type {Plugin, ViteDevServer} from 'vite'
import buildAssets from './build-assets.json'
import isolationHeaders from './isolation-headers.json'

const attachHeaders = ({middlewares}: Pick<ViteDevServer, 'middlewares'>): void => {
  // Set the headers before Vite can return a cached response or forward the request to Nitro.
  middlewares.use((_request, response, next) => {
    for (const [name, value] of Object.entries(isolationHeaders)) {
      response.setHeader(name, value)
    }
    next()
  })
}

export const crossOriginIsolation = (): Plugin => ({
  configurePreviewServer(server) {
    attachHeaders(server)
    server.middlewares.use((request, response, next) => {
      if (request.url?.startsWith(`/${buildAssets.directory}/`)) {
        for (const [name, value] of Object.entries(buildAssets.headers)) {
          response.setHeader(name, value)
        }
      }
      next()
    })
  },
  configureServer: attachHeaders,
  name: 'wallpaper-cross-origin-isolation',
})
