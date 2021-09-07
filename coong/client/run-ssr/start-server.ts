import express, {static as expressStatic} from 'express'

export interface StartServerOptions {
  distClient?: string
  distServer?: string
  /**
   * @default 8080
   */
  port?: number
  root: string
  entry?: string
}

const OK = 200

export const DEFAULT_PORT = 8080

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

  app.use(expressStatic(`${root}/${distClient}`, {index: false}))

  app.get('*', async (req, res, next) => {
    const url = req.originalUrl
    const {headers} = req
    
    const context = {
      hostname: headers.host,
      protocol: 'http',
      url,
      cookies: {},
      statusCode: OK,
      ip: req.socket.remoteAddress,
      headers,
      responseHeaders: {'content-type': 'text:html; charset=utf-8'},
      memcache: null,
      
    }
    

    if(req.method !== "GET" || !url) {

      return next();
    }
    
    const {html} = await render(url, {req, res, context})

    res.statusCode = context.statusCode
    Object.keys(context.responseHeaders).map(key => res.setHeader(key, context.responseHeaders[key]));
    
    res.status(OK).set({'Content-Type': 'text/html'}).end(html)
  })

  return new Promise<{port: number}>((resolve) => {
    app.listen(port, () => {
      resolve({port})
    })
  })
}
