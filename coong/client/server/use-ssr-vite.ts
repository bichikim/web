import {Express, static as expressStatic} from 'express'
import {createServer, InlineConfig} from 'vite'

export interface UseViteOptions extends Omit<InlineConfig, 'server' | 'root'> {
  dist: string
  production?: boolean
  root: string
}

export const useSsrVite = async (app: Express, options: UseViteOptions) => {
  const {dist, root, production, ...rest} = options

  if (production) {
    app.use(expressStatic(dist, {index: false}))
    return
  }
  const devServer = await createServer({
    ...rest,
    root,
    server: {
      middlewareMode: 'ssr',
      watch: {
        interval: 100,
        usePolling: true,
      },
    },
  })
  app.use(devServer.middlewares)

  return devServer
}
