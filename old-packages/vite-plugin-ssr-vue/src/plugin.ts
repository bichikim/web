import http from 'node:http'
import {Connect, Plugin, UserConfig} from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import {createServerHandler, CreateServerHandlerOptions} from './create-server-handler'
import {parse} from 'node-html-parser'
import {entryFromTemplate} from './entry-from-template'

export type NextFunction = (error?: any) => void
export type NextHandleFunction = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: NextFunction,
) => void

const htmlName = 'index.html'
const defaultEntry = 'src/main.ts'

export interface ViteVueSsrOptions extends CreateServerHandlerOptions {
  cwd?: string
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
  const {
    name = 'vite-plugin-ssr-vue',
    middlewares = [],
    enabled = true,
    cwd = process.cwd(),
  } = options
  if (enabled) {
    const htmlFile = path.join(cwd, htmlName)
    return {
      config: async (): Promise<UserConfig> => {
        const htmlTemplate = await fs.promises.readFile(htmlFile, 'utf8')
        const htmlNode = parse(htmlTemplate)
        const entry = entryFromTemplate(htmlNode) ?? defaultEntry
        return {
          build: {
            outDir: 'dist/ssr',
            ssr: path.join(cwd, entry),
          },
          ssr: {
            noExternal: [name],
          },
          // ssr is not in the UserConfig but It works
        } as UserConfig
      },

      async configureServer(server) {
        const handler = createServerHandler(server, options)

        return (): Connect.Server => {
          for (const handler of middlewares) {
            server.middlewares.use(handler)
          }

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
