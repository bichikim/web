import {Express, static as expressStatic} from 'express'
import {createServer} from 'vite'

export interface UseViteOptions {
  dist: string
  production?: boolean
  root: string
}

export const useSsrVite = async (app: Express, options: UseViteOptions) => {
  const {dist, root, production} = options

  if (production) {
    app.use(expressStatic(dist, {index: false}))
    return
  }
  const devServer = await createServer({
    root,
    server: {middlewareMode: true},
  })
  app.use(devServer.middlewares)

  return devServer
}
