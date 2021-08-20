import express from 'express'
import {useSsrVite} from './use-ssr-vite'
import {promisify} from '@winter-love/utils'
import {createPageRender} from './create-page-render'

export interface StartServerOptions {
  dist?: string
  /**
   * @default 8080
   */
  port?: number
  production?: boolean
  root: string
  src?: string
}

const OK = 200

export const DEFAULT_PORT = 8080

export const startServer = async (options: StartServerOptions) => {
  const {root, production, port = DEFAULT_PORT, dist = 'dist', src = 'src'} = options
  const app = express()

  const viteDevServer = await useSsrVite(app, {
    dist: `${root}/dist/client`,
    production,
    root,
  })

  const createApp = viteDevServer ? (await viteDevServer.ssrLoadModule(`${root}/${src}/create-app.ts`)).createApp :
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(`${root}/${dist}/create-app.js`).createApp

  const renderPage = createPageRender(createApp, {manifest: {}, template: ''})

  app.get('*', async (req, res) => {
    const url = req.originalUrl
    const pageContext = {
      url,
    }

    const html = await renderPage(url, pageContext)
    res.status(OK).set({'Content-Type': 'text/html'}).end(html)
  })

  const listen = promisify(app.listen)

  return listen(port).then(() => {
    return {
      port,
    }
  })
}
