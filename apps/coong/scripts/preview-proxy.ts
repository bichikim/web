import {createServer, type IncomingMessage, type ServerResponse} from 'node:http'
import {readFile, stat} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname, join, extname} from 'node:path'
import {spawn} from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const publicDir = join(projectRoot, '.output', 'public')

const CLIENT_PORT = Number(process.env.CLIENT_PORT) || 3000
const SERVER_PORT = Number(process.env.SERVER_PORT) || 4000
const SERVER_URL = `http://localhost:${SERVER_PORT}`

const serverScriptPath = join(projectRoot, '.output', 'server', 'index.mjs')

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
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

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
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
    const ext = extname(filePath)
    const contentType = getMimeType(ext)

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', content.length)
    res.statusCode = 200
    res.end(content)

    return true
  } catch (err) {
    // File not found
    return false
  }
}

/**
 * Proxy request to server
 */
async function proxyToServer(req: IncomingMessage, targetPath: string): Promise<Response> {
  const requestUrl = req.url ?? '/'
  const search = requestUrl.includes('?') ? requestUrl.substring(requestUrl.indexOf('?')) : ''
  const proxyUrl = `${SERVER_URL}${targetPath}${search}`

  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }

  let body: Buffer | undefined

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []

      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
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
  const pathname = url.pathname

  try {
    // Proxy requests to /_server
    if (pathname.startsWith('/_server')) {
      const proxyRes = await proxyToServer(req, pathname)

      // Copy response headers
      proxyRes.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
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
      } catch (err) {
        // If index.html doesn't exist, return 404
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain')
        res.end('Not Found')
      }
    }
  } catch (err) {
    console.error('Request error:', err)

    if (!res.headersSent) {
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }
})

/**
 * Check if server is already running
 */
async function isServerRunning() {
  try {
    const response = await fetch(SERVER_URL, {signal: AbortSignal.timeout(1000)})

    return response.ok || response.status < 500
  } catch {
    return false
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 30, delay = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerRunning()) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  return false
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

  serverProcess.on('error', (err) => {
    console.error(`❌ Failed to start backend server: ${err.message}`)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  })

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`❌ Backend server exited with code ${code}`)
      // eslint-disable-next-line n/no-process-exit
      process.exit(1)
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

  if (!isRunning) {
    // Start backend server
    startBackendServer()
    // Wait for server to be ready
    console.log(`⏳ Waiting for server to be ready...`)
    const isReady = await waitForServer()

    if (!isReady) {
      console.error(`❌ Server failed to start within timeout`)
      // eslint-disable-next-line n/no-process-exit
      process.exit(1)
    }

    console.log(`✅ Backend server is ready`)
  } else {
    console.log(`✅ Backend server is already running`)
  }

  // Start proxy server
  server.listen(CLIENT_PORT, () => {
    console.log(`✅ Client server running on http://localhost:${CLIENT_PORT}`)
    console.log(`📡 Proxying /_server and missing files to ${SERVER_URL}`)
  })
}

main().catch((err) => {
  console.error('❌ Failed to start:', err)
  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
})
