import * as dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {serve} from '@hono/node-server'
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {healthRoute, homeRoute} from './routes'
import {bindYjsWebSocket} from './utils/upgrade-yjs-websocket'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

dotenv.config({path: envPath})

const DEFAULT_PORT = 1234
const DEFAULT_HOSTNAME = '127.0.0.1'
const port = Number(process.env.PORT ?? DEFAULT_PORT)
const hostname = process.env.HOST ?? DEFAULT_HOSTNAME

export const app = new Hono()
export type AppType = typeof app

app.use(
  '*',
  cors({
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'OPTIONS'],
    origin: '*',
  }),
)
app.route('/health', healthRoute)
app.route('/', homeRoute)

const server = serve(
  {
    fetch: app.fetch,
    hostname,
    port,
  },
  (info) => {
    console.info(`yjs server listening on http://${hostname}:${String(info.port)}`)
  },
)

bindYjsWebSocket(server)

const shutdown = (signal: string) => {
  console.info(`received ${signal}, shutting down`)

  server.close(() => {
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit -- graceful shutdown after HTTP close
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
