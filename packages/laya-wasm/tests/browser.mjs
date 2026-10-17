import assert from 'node:assert/strict'
import {createReadStream} from 'node:fs'
import {mkdtemp, rm, stat} from 'node:fs/promises'
import {createServer as createHttpServer} from 'node:http'
import {constants} from 'node:http2'
import {tmpdir} from 'node:os'
import {join, resolve, sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {build, createServer} from 'vite'

const [, , bundle, mode] = process.argv
assert.ok(bundle?.startsWith('/'), 'Pass the absolute directory produced by tools/prepare.py')
const root = fileURLToPath(new URL('.', import.meta.url))
const production = mode === '--production'
const port = 3399
const epochs = 5
const deadline = 240_000

const serveFiles = (directory, prefix) => async (request, response, next) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  if (!pathname.startsWith(prefix)) {
    next()
    return
  }
  const name = pathname.slice(prefix.length) || 'index.html'
  const path = resolve(directory, name)
  if (!path.startsWith(resolve(directory) + sep)) {
    response.writeHead(constants.HTTP_STATUS_FORBIDDEN).end()
    return
  }
  try {
    const metadata = await stat(path)
    if (!metadata.isFile()) {
      response.writeHead(constants.HTTP_STATUS_NOT_FOUND).end()
      return
    }
    const type = path.endsWith('.wasm')
      ? 'application/wasm'
      : path.endsWith('.html')
        ? 'text/html'
        : path.endsWith('.js') || path.endsWith('.mjs')
          ? 'text/javascript'
          : path.endsWith('.json')
            ? 'application/json'
            : 'application/octet-stream'
    response.writeHead(constants.HTTP_STATUS_OK, {
      'Content-Length': metadata.size,
      'Content-Type': type,
    })
    createReadStream(path).on('error', next).pipe(response)
  } catch (error) {
    next(error)
  }
}
const modelFiles = serveFiles(bundle, '/models/')
let server
let browser
let output
try {
  if (production) {
    output = await mkdtemp(join(tmpdir(), 'laya-wasm-browser-'))
    await build({build: {outDir: output, target: 'esnext'}, configFile: false, root})
    const assets = serveFiles(output, '/')
    server = createHttpServer((request, response) => {
      const failure = () => response.writeHead(constants.HTTP_STATUS_NOT_FOUND).end()
      modelFiles(request, response, () => {
        assets(request, response, failure).catch(failure)
      }).catch(failure)
    })
    await new Promise((complete, reject) => {
      server.once('error', reject)
      server.listen(port, '127.0.0.1', complete)
    })
  } else {
    server = await createServer({
      configFile: false,
      plugins: [
        {
          configureServer: (vite) => {
            vite.middlewares.use(modelFiles)
          },
          name: 'laya-test-models',
        },
      ],
      root,
      server: {
        fs: {allow: [fileURLToPath(new URL('../../..', import.meta.url))]},
        host: '127.0.0.1',
        port,
        strictPort: true,
      },
    })
    await server.listen()
  }
  browser = await chromium.launch({headless: true})
  const page = await browser.newPage()
  const failure = new Promise((complete, reject) => {
    page.once('pageerror', reject)
  })
  page.on('console', (message) => console.log(message.text()))
  await page.goto(`http://127.0.0.1:${port}/?bundle=/models/`)
  await Promise.race([
    failure,
    page.waitForFunction(() => 'result' in globalThis, undefined, {timeout: deadline}),
  ])
  const result = await page.evaluate(() => globalThis.result)
  assert.equal(result.result.status, 'completed')
  assert.equal(result.result.steps, epochs)
  assert.equal(result.weightsChanged, true)
  assert.ok(result.after > result.before, 'Target probability must increase')
  assert.ok(result.losses.at(-1) < result.losses[0], 'Cross entropy must decrease')
  assert.deepEqual(result.reset, result.original)
  assert.deepEqual(result.restored, result.trained)
  assert.deepEqual(result.loaded, result.trained)
  assert.equal(result.cancelled.status, 'cancelled')
  assert.equal(result.cancelled.steps, 0)
  assert.equal(result.unchanged, true)
  assert.deepEqual(Object.keys(result.mixed.answers).sort(), ['choice', 'noul', 'score'])
  console.log(
    JSON.stringify(
      {
        after: result.after,
        before: result.before,
        checkpointReload: 'passed',
        losses: result.losses,
        production,
        steps: result.result.steps,
      },
      null,
      2,
    ),
  )
} finally {
  await browser?.close()
  if (server !== undefined) {
    if (production) {
      await new Promise((complete, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            complete()
          }
        })
      })
    } else {
      await server.close()
    }
  }
  if (output !== undefined) {
    await rm(output, {force: true, recursive: true})
  }
}
