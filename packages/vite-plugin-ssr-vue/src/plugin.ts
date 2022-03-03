import http from 'http'
import {Connect, Plugin, UserConfig} from 'vite'
import {createServerHandler, CreateServerHandlerOptions} from './create-server-handler'

export type NextFunction = (error?: any) => void
export type NextHandleFunction = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: NextFunction,
) => void

export interface ViteVueSsrOptions extends CreateServerHandlerOptions {
  /**
   * enable vite vue ssr plugin
   * @default true
   */
  enabled?: boolean
  middlewares?: NextHandleFunction[]

  /**
   * plugin name
   * @default 'vite-plugin-vue-ssr'
   */
  name?: string
}

export const plugin = (options: ViteVueSsrOptions): Plugin => {
  const {name = 'vite-plugin-ssr-vue', middlewares = [], enabled = true} = options
  if (enabled) {
    return {
      config(): UserConfig {
        return {
          ssr: {
            noExternal: [name],
          },
          // ssr is not in the UserConfig but It works
        } as UserConfig
      },

      async configureServer(server) {
        const handler = createServerHandler(server, options)

        return (): Connect.Server => {
          middlewares.forEach((handler) => {
            server.middlewares.use(handler)
          })

          return server.middlewares.use(handler)
        }
      },
      // async configResolved(config:ResolvedConfig) {
      //
      // },
      name,
    }
  }
  return {
    name,
  }
}

