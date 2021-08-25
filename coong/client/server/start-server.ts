import express from 'express'
import {useSsrVite} from './use-ssr-vite'
import {createPageRender} from './create-page-render'
import {CreateApp} from 'src/create-app'
import createEmotionServer from '@emotion/server/create-instance'
import inject from 'node-inject-html'

export interface StartServerOptions {
  dist?: string
  /**
   * @default 8080
   */
  port?: number
  production?: boolean
  root: string
  src?: string
  template?: () => string
}

const OK = 200

export const DEFAULT_PORT = 8080

export const startServer = async (options: StartServerOptions) => {
  const {
    root = process.cwd(),
    production,
    port = DEFAULT_PORT,
    dist = 'dist',
    src = 'src',
    template,
  } = options
  const app = express()

  const viteDevServer = await useSsrVite(app, {
    dist: `${root}/dist/client`,
    production,
    root,
  })

  const createApp: CreateApp = viteDevServer ?
    (await viteDevServer.ssrLoadModule(`${root}/${src}/create-app.ts`)).createApp :
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(`${root}/${dist}/create-app.js`).createApp

  app.get('*', async (req, res) => {
    const url = req.originalUrl

    const {app: clientApp, router, emotion} = createApp(true, {req, res})

    const renderPage = createPageRender(clientApp, {manifest: {}, router})

    const rowTemplate = template?.() ?? ''

    const _template = viteDevServer ? await viteDevServer.transformIndexHtml(url, rowTemplate) : rowTemplate

    const appContent = await renderPage(url, _template)

    if (emotion) {
      const emotionServer = createEmotionServer(emotion.cache)
      const {html, styles} = emotionServer.extractCriticalToChunks(appContent)
      const stylesInHead = emotionServer.constructStyleTagsFromChunks({html, styles})
      res.status(OK).set({'Content-Type': 'text/html'}).end(inject(html, {headEnd: stylesInHead}))
      return
    }

    res.status(OK).set({'Content-Type': 'text/html'}).end(appContent)
  })

  return new Promise<{port: number}>((resolve) => {
    app.listen(port, () => {
      resolve({port})
    })
  })
}
