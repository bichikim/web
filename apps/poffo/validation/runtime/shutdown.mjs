import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {connect} from 'node:net'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createInterface} from 'node:readline'
import {parseArgs} from 'node:util'

const {values} = parseArgs({options: {'expect-stall': {type: 'boolean'}}})
const executable = process.env.POFFO_INSTALLED_CLI
const output = process.env.POFFO_VALIDATION_OUTPUT
assert.ok(executable && output, 'Require an installed CLI and evidence directory')
const workspace = await mkdtemp(join(tmpdir(), 'Poffo shutdown '))
const child = spawn(executable, ['start', '--cli', '--parent-stdio', '--workspace', workspace], {
  stdio: ['pipe', 'pipe', 'pipe'],
})
const lines = createInterface({input: child.stdout})
child.stderr.resume()
const LIMIT = 30_000
const SHUTDOWN_LIMIT = 2000
let connection
let socket
const report = {architecture: process.arch, complete: false, platform: process.platform}
try {
  for await (const [line] of onceReady(lines, child)) {
    if (JSON.parse(line).ready === true) {
      break
    }
  }
  connection = JSON.parse(await readFile(join(workspace, '.poffo/connection.json'), 'utf8'))
  const url = new URL(connection.url)
  socket = connect({host: url.hostname, port: Number(url.port)})
  socket.on('error', () => {
    /* A closing server may reset this deliberately incomplete request. */
  })
  await once(socket, 'connect', {signal: AbortSignal.timeout(LIMIT)})
  const accepted = once(socket, 'data', {signal: AbortSignal.timeout(LIMIT)})
  socket.write(
    [
      'POST /api/command HTTP/1.1',
      `Host: ${url.host}`,
      `Authorization: Bearer ${connection.token}`,
      'Content-Type: application/json',
      'Content-Length: 1000',
      'Expect: 100-continue',
      '',
      '',
    ].join('\r\n'),
  )
  assert.match((await accepted)[0].toString(), /HTTP\/1\.1 100 Continue/u)
  socket.write('{')
  report.requestAccepted = true
  const started = performance.now()
  const exited = once(child, 'exit', {signal: AbortSignal.timeout(SHUTDOWN_LIMIT)})
  child.stdin.end()
  try {
    const [code] = await exited
    assert.equal(code, 0)
    report.exitCode = code
    report.stalled = false
  } catch (error) {
    if (error.name !== 'AbortError') {
      throw error
    }
    report.stalled = true
  }
  report.elapsed = performance.now() - started
  if (report.stalled) {
    report.descriptorRetained =
      (await readFile(join(workspace, '.poffo/connection.json'), 'utf8')).length > 0
    const released = once(child, 'exit', {signal: AbortSignal.timeout(LIMIT)})
    socket.destroy()
    const [code] = await released
    assert.equal(code, 0, 'The old host must exit after the incomplete client is released')
    report.exitedAfterClientRelease = true
  }
  await assert.rejects(readFile(join(workspace, '.poffo/connection.json')), {code: 'ENOENT'})
  report.descriptorRemoved = true
  assert.equal(report.stalled, values['expect-stall'] === true)
  report.complete = !report.stalled
} catch (error) {
  report.failure = error.message
  process.exitCode = 1
} finally {
  socket?.destroy()
  lines.close()
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit', {signal: AbortSignal.timeout(LIMIT)})
    if (connection !== undefined) {
      process.kill(connection.pid)
    }
    child.kill()
    await exited.catch(() => undefined)
  }
  await mkdir(output, {recursive: true})
  await writeFile(join(output, 'shutdown.json'), JSON.stringify(report, null, 2))
  await rm(workspace, {force: true, recursive: true})
  process.stdout.write(`${JSON.stringify(report)}\n`)
}

async function* onceReady(stream, process_) {
  const signal = AbortSignal.timeout(LIMIT)
  while (true) {
    const line = once(stream, 'line', {signal})
    const failed = (code) => stream.emit('error', new Error(`CLI exited before readiness: ${code}`))
    process_.once('exit', failed)
    try {
      // Consume the child's ordered output until it emits readiness.
      // eslint-disable-next-line no-await-in-loop
      yield await line
    } finally {
      process_.off('exit', failed)
    }
  }
}
