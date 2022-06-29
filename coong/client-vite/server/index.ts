import express from 'express'
import {createPageRenderer} from 'vite-plugin-ssr'
import {createServer} from 'vite'

const isProduction = process.env.NODE_ENV === 'production'
const root = `${__dirname}/..`

startServer()

async function startServer() {
  const app = express()

  let viteDevServer
  if (isProduction) {
    app.use(express.static(`${root}/dist/client`))
  } else {
    viteDevServer = await createServer({
      root,
      server: {middlewareMode: 'ssr'},
    })
    app.use(viteDevServer.middlewares)
  }

  const renderPage = createPageRenderer({isProduction, root, viteDevServer})
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl
    const pageContextInit = {
      url,
    }
    const pageContext = await renderPage(pageContextInit)
    const {httpResponse} = pageContext
    if (!httpResponse) {
      return next()
    }
    const {pipeToNodeWritable, statusCode, contentType} = httpResponse
    res.status(statusCode).type(contentType)
    pipeToNodeWritable(res)
  })

  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}
