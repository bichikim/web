import type {Plugin, ViteDevServer} from 'vite'
import isolationHeaders from './isolation-headers.json'

const attachHeaders = ({middlewares}: Pick<ViteDevServer, 'middlewares'>): void => {
  // Set the headers before Vite can return a cached response or render the page.
  middlewares.use((_request, response, next) => {
    for (const [name, value] of Object.entries(isolationHeaders)) {
      response.setHeader(name, value)
    }
    next()
  })
}

export const crossOriginIsolation = (): Plugin => ({
  configurePreviewServer: attachHeaders,
  configureServer: attachHeaders,
  name: 'wallpaper-cross-origin-isolation',
})
