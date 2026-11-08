import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {readFile, writeFile} from 'node:fs/promises'
import {createServer, request as forwardRequest} from 'node:http'
import {join} from 'node:path'
import {createInterface} from 'node:readline'

/** Observes real commands through an isolated CLI host; authorization headers are never recorded. */
export const traceNativeSave = async ({executable, workspace, output}) => {
  const child = spawn(executable, ['start', '--cli', '--parent-stdio', '--workspace', workspace], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  child.stderr.resume()
  const lines = createInterface({input: child.stdout})
  const STARTUP_LIMIT = 30_000
  const signal = AbortSignal.timeout(STARTUP_LIMIT)
  const ready = new Promise((resolve, reject) => {
    lines.on('line', (line) => {
      if (JSON.parse(line).ready === true) {
        resolve()
      }
    })
    child.once('error', reject)
    child.once('exit', (code) => reject(new Error(`Trace host exited: ${code}`)))
    signal.addEventListener('abort', () => reject(signal.reason), {once: true})
  })
  await ready.catch((error) => {
    child.stdin.end()
    child.kill()
    throw error
  })
  lines.close()
  const descriptor = join(workspace, '.poffo/connection.json')
  const original = await readFile(descriptor, 'utf8')
  const upstream = JSON.parse(original)
  const records = []
  let stream
  let lastStreamData
  let writes = Promise.resolve()
  const record = (event) => {
    records.push({at: new Date().toISOString(), ...event})
    writes = writes.then(() =>
      writeFile(join(output, 'save-trace.json'), JSON.stringify(records, null, 2)),
    )
  }
  const proxy = createServer((request, response) => {
    const route = new URL(request.url, upstream.url)
    const started = Date.now()
    const target = forwardRequest(route, {
      headers: {...request.headers, host: route.host},
      method: request.method,
    })
    let size = 0
    let command
    const chunks = []
    const TRACE_LIMIT = 4096
    request.on('data', (chunk) => {
      size += chunk.length
      if (size <= TRACE_LIMIT) {
        chunks.push(chunk)
      }
    })
    request.on('end', () => {
      if (request.method === 'POST' && route.pathname === '/api/command' && size <= TRACE_LIMIT) {
        command = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        record({operation: command.operation, phase: 'request'})
      }
    })
    target.on('response', (incoming) => {
      response.writeHead(incoming.statusCode, incoming.headers)
      if (route.pathname === '/api/events') {
        stream = response
        incoming.on('data', () => {
          lastStreamData = Date.now()
        })
      }
      if (command?.operation === 'document.saved') {
        const replies = []
        incoming.on('data', (chunk) => replies.push(chunk))
        incoming.on('end', () => {
          const result = JSON.parse(Buffer.concat(replies).toString('utf8'))
          record({
            error: result.error,
            ok: result.ok,
            operation: command.operation,
            phase: 'response',
            status: incoming.statusCode,
          })
        })
      }
      incoming.pipe(response)
    })
    target.on('error', (error) => {
      record({error: error.message, path: route.pathname})
      response.destroy(error)
    })
    response.on('close', () => {
      if (route.pathname === '/api/events') {
        record({
          elapsed: Date.now() - started,
          idle: Date.now() - lastStreamData,
          phase: 'stream-closed',
        })
      }
      target.destroy()
    })
    request.pipe(target)
  })
  proxy.listen(0, '127.0.0.1')
  await once(proxy, 'listening')
  assert.equal(typeof proxy.address(), 'object')
  await writeFile(
    descriptor,
    JSON.stringify({...upstream, url: `http://127.0.0.1:${proxy.address().port}`}),
  )
  return {
    close: async () => {
      proxy.closeAllConnections()
      proxy.close()
      child.stdin.end()
      await writes
    },
    restore: async () => {
      const current = JSON.parse(await readFile(descriptor, 'utf8'))
      assert.equal(current.sessionId, upstream.sessionId)
      assert.equal(current.pid, upstream.pid)
      await writeFile(descriptor, original)
    },
    waitForStreamClose: async () => {
      assert.ok(stream)
      if (!stream.destroyed) {
        const IDLE_LIMIT = 75_000
        await once(stream, 'close', {signal: AbortSignal.timeout(IDLE_LIMIT)}).catch((error) => {
          if (error.name !== 'AbortError') {
            throw error
          }
          record({idle: Date.now() - lastStreamData, phase: 'stream-remained-open'})
        })
      }
    },
  }
}
