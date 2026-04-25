import * as dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {serve} from '@hono/node-server'
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {agentRoute, countryRoute, healthRoute, homeRoute} from './routes'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

dotenv.config({path: envPath})

const DEFAULT_PORT = 3040
const port = Number(process.env.PORT ?? DEFAULT_PORT)

export const app = new Hono()
export type AppType = typeof app
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)
app.route('/health', healthRoute)
app.route('/country', countryRoute)
app.route('/agent', agentRoute)
app.route('/', homeRoute)

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.info(`cli-server listening on http://localhost:${String(info.port)}`)
  },
)

const shutdown = (signal: string) => {
  console.info(`received ${signal}, shutting down`)

  server.close(() => {
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit -- graceful shutdown after HTTP close
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
