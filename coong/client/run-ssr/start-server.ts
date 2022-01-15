/* eslint-disable @typescript-eslint/no-var-requires */
import express, {static as expressStatic} from 'express'
import compression from 'compression'
import helmet, {contentSecurityPolicy} from 'helmet'

export interface StartServerOptions {
  distClient?: string
  distServer?: string
  entry?: string
  /**
   * @default 8080
   */
  port?: number
  root: string
}

const OK = 200

export const DEFAULT_PORT = 8080
const GET_METHOD = 'GET'

export const startServer = async (options: StartServerOptions) => {
  const {
    root = process.cwd(),
    port = DEFAULT_PORT,
    distClient = 'dist/client',
    distServer = 'dist/server',
    entry = 'main',
  } = options
  const app = express()

  const render: any = require(`${root}/${distServer}/${entry}.js`).default
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...contentSecurityPolicy.getDefaultDirectives(),
        // eslint-disable-next-line quotes
        'script-src': ["'self'", "*.coong.io", "'unsafe-inline'"],
        // eslint-disable-next-line
        'media-src': ["'self'", "*.coong.io"],
      },
    },
  }))
  app.use(compression())
  app.use(expressStatic(`${root}/${distClient}`, {index: false}))

  app.get('*', async (req, res, next) => {
    const url = req.originalUrl
    const {headers, socket, method} = req

    const context = {
      cookies: {},
      headers,
      hostname: headers.host,
      ip: socket.remoteAddress,
      memcache: null,
      protocol: 'http',
      responseHeaders: {'content-type': 'text:html; charset=utf-8'},
      statusCode: OK,
      url,

    }

    if (method !== GET_METHOD || !url) {

      return next()
    }

    const {html} = await render(url, {context, req, res})

    res.statusCode = context.statusCode
    Object.keys(context.responseHeaders).map((key) => res.setHeader(key, context.responseHeaders[key]))

    res.status(OK).set({'Content-Type': 'text/html'}).end(html)
  })

  return new Promise<{port: number}>((resolve) => {
    app.listen(port, () => {
      resolve({port})
    })
  })
}
