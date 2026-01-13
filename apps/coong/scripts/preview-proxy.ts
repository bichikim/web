/* eslint-disable no-console */
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http'
import {readFile, stat} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname, extname, join} from 'node:path'
import {spawn} from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const publicDir = join(projectRoot, '.output', 'public')

const DEFAULT_CLIENT_PORT = 3000
const DEFAULT_SERVER_PORT = 4000
const CLIENT_PORT = Number(process.env.CLIENT_PORT) || DEFAULT_CLIENT_PORT
const SERVER_PORT = Number(process.env.SERVER_PORT) || DEFAULT_SERVER_PORT
const SERVER_URL = `http://localhost:${SERVER_PORT}`

const serverScriptPath = join(projectRoot, '.output', 'server', 'index.mjs')

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.css': 'text/css',
    '.eot': 'application/vnd.ms-fontobject',
    '.gif': 'image/gif',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'audio/ogg',
    '.otf': 'font/otf',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain',
    '.wasm': 'application/wasm',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
  }

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}

/**
 * Serve static file or return null if not found
 */
async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const requestUrl = req.url ?? '/'
  const host = req.headers.host ?? 'localhost'
  const url = new URL(requestUrl, `http://${host}`)
  let filePath = join(publicDir, url.pathname === '/' ? 'index.html' : url.pathname)

  try {
    const stats = await stat(filePath)

    if (!stats.isFile()) {
      // If it's a directory, try index.html
      filePath = join(filePath, 'index.html')
      await stat(filePath)
    }

    const content = await readFile(filePath)
    const extension = extname(filePath)
    const contentType = getMimeType(extension)

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', content.length)
    res.statusCode = 200
    res.end(content)

    return true
  } catch {
    // File not found
    return false
  }
}

const isArrayBufferUint8Array = (buffer: any): buffer is Uint8Array<ArrayBuffer> => {
  return buffer?.buffer instanceof ArrayBuffer
}

/**
 * Proxy request to server
 */
async function proxyToServer(req: IncomingMessage, targetPath: string): Promise<Response> {
  const requestUrl = req.url ?? '/'
  const search = requestUrl.includes('?') ? requestUrl.slice(Math.max(0, requestUrl.indexOf('?'))) : ''
  const proxyUrl = `${SERVER_URL}${targetPath}${search}`

  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value)
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(', '))
    }
  }

  let body: Uint8Array<ArrayBuffer> | undefined

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
      const chunks: Uint8Array<ArrayBuffer>[] = []

      req.on('data', (chunk: Buffer) => {
        if (!isArrayBufferUint8Array(chunk)) {
          return
        }

        chunks.push(chunk)
      })

      req.on('end', () => {
        const buf = Buffer.concat(chunks)

        if (!isArrayBufferUint8Array(buf)) {
          return
        }

        resolve(new Uint8Array<ArrayBuffer>(buf.buffer, buf.byteOffset, buf.byteLength))
      })
      req.on('error', reject)
    })
  }

  const proxyReq = await fetch(proxyUrl, {
    body,
    headers,
    method: req.method,
  })

  return proxyReq
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const requestUrl = req.url ?? '/'
  const host = req.headers.host ?? 'localhost'
  const url = new URL(requestUrl, `http://${host}`)
  const {pathname} = url

  try {
    // Proxy requests to /_server
    if (pathname.startsWith('/_server')) {
      const proxyRes = await proxyToServer(req, pathname)

      // Copy response headers
      for (const [key, value] of proxyRes.headers.entries()) {
        res.setHeader(key, value)
      }

      res.statusCode = proxyRes.status
      res.statusMessage = proxyRes.statusText

      // Stream response body
      const body = await proxyRes.arrayBuffer()

      res.end(Buffer.from(body))

      return
    }

    // Try to serve static file
    const served = await serveStatic(req, res)

    // If static file not found, serve index.html for SPA routing
    if (!served) {
      const indexPath = join(publicDir, 'index.html')

      try {
        const content = await readFile(indexPath)

        res.setHeader('Content-Type', 'text/html')
        res.setHeader('Content-Length', content.length)
        res.statusCode = 200
        res.end(content)
      } catch {
        // If index.html doesn't exist, return 404
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain')
        res.end('Not Found')
      }
    }
  } catch (error) {
    console.error('Request error:', error)

    if (!res.headersSent) {
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }
})

const INTERNAL_SERVER_ERROR_STATUS = 500

const DEFAULT_TIMEOUT = 1000

/**
 * Check if server is already running
 */
async function isServerRunning() {
  try {
    const response = await fetch(SERVER_URL, {signal: AbortSignal.timeout(DEFAULT_TIMEOUT)})

    return response.ok || response.status < INTERNAL_SERVER_ERROR_STATUS
  } catch {
    return false
  }
}

const DEFAULT_MAX_ATTEMPTS = 30
const DEFAULT_DELAY = 1000

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = DEFAULT_MAX_ATTEMPTS, delay = DEFAULT_DELAY) {
  const attempt = async (index: number): Promise<boolean> => {
    if (await isServerRunning()) {
      return true
    }

    if (index >= maxAttempts - 1) {
      return false
    }

    await sleep(delay)

    return attempt(index + 1)
  }

  return attempt(0)
}

/**
 * Start backend server
 */
function startBackendServer() {
  console.log(`🚀 Starting backend server on port ${SERVER_PORT}...`)

  const serverProcess = spawn('node', ['-r', 'dotenv/config', serverScriptPath], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
    },
    stdio: 'inherit',
  })

  serverProcess.on('error', (error) => {
    console.error(`❌ Failed to start backend server: ${error.message}`)

    throw new Error('Failed to start backend server')
  })

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`❌ Backend server exited with code ${code}`)

      throw new Error('Backend server exited with code')
    }
  })

  // Cleanup on process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down backend server...')
    serverProcess.kill('SIGINT')
    // eslint-disable-next-line n/no-process-exit
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down backend server...')
    serverProcess.kill('SIGTERM')
    // eslint-disable-next-line n/no-process-exit
    process.exit(0)
  })

  return serverProcess
}

/**
 * Main function
 */
async function main() {
  // Check if server is already running
  const isRunning = await isServerRunning()

  if (isRunning) {
    console.log(`✅ Backend server is already running`)
  } else {
    // Start backend server
    startBackendServer()
    // Wait for server to be ready
    console.log(`⏳ Waiting for server to be ready...`)
    const isReady = await waitForServer()

    if (!isReady) {
      console.error(`❌ Server failed to start within timeout`)

      throw new Error('Server failed to start within timeout')
    }

    console.log(`✅ Backend server is ready`)
  }

  // Start proxy server
  server.listen(CLIENT_PORT, () => {
    console.log(`✅ Client server running on http://localhost:${CLIENT_PORT}`)
    console.log(`📡 Proxying /_server and missing files to ${SERVER_URL}`)
  })
}

main().catch((error) => {
  console.error('❌ Failed to start:', error)
  throw new Error('Failed to start')
})
