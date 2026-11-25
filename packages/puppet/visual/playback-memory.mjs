/* eslint-disable no-await-in-loop -- Every checkpoint follows completed frames or disposed owners. */
/* eslint-disable no-magic-numbers -- Literal sizes and counts define the stress workload and its budgets. */
/**
 * Build the player, then set MODEL and OUTPUT before running this local Chromium memory test.
 * Completed frame counts replace a wall-clock soak; each sample follows an explicit full GC.
 * WARMUP_FRAMES=1200 FRAMES=12000 DISPLAY_FRAMES=3000 CYCLES=20 control the workload.
 * No source hooks or private model uploads are used. GPU driver memory is not measured.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {once} from 'node:events'
import {readFile, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {chromium} from 'playwright'

const MEBIBYTE = 1024 * 1024
const limits = {
  backingStorage: MEBIBYTE,
  listeners: 8,
  mainHeap: 8 * MEBIBYTE,
  nodes: 16,
  workerHeap: MEBIBYTE,
}
const configuration = {
  cycles: Number(process.env.CYCLES ?? 20),
  deltaTime: 1 / 60,
  displayFrames: Number(process.env.DISPLAY_FRAMES ?? 3000),
  frames: Number(process.env.FRAMES ?? 12000),
  model: process.env.MODEL,
  warmupFrames: Number(process.env.WARMUP_FRAMES ?? 1200),
}
assert(configuration.model && process.env.OUTPUT, 'MODEL and OUTPUT are required')
for (const name of ['frames', 'warmupFrames', 'cycles', 'displayFrames']) {
  assert(Number.isSafeInteger(configuration[name]) && configuration[name] > 0, `Invalid ${name}`)
}
const root = new URL('../', import.meta.url)
const model = await readFile(configuration.model)
const player = await readFile(new URL('dist/player.js', root))
const workerPath = player.toString().match(/assets\/worker-[^"']+\.js/u)?.[0]
assert(workerPath, 'Built playback Worker was not found')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><title>Puppet memory test</title>')
    } else if (path === '/fixture.js') {
      response.setHeader('Content-Type', 'text/javascript')
      response.end(await readFile(new URL('./memory/create-fixture.mjs', import.meta.url)))
    } else if (path === '/create-playback.mjs') {
      response.setHeader('Content-Type', 'text/javascript')
      response.end(await readFile(new URL('./memory/create-playback.mjs', import.meta.url)))
    } else if (path === '/model') {
      response.end(model)
    } else if (path.startsWith('/dist/')) {
      const file = new URL(`.${path}`, root)
      assert(file.href.startsWith(new URL('dist/', root).href), 'Invalid artifact path')
      response.setHeader(
        'Content-Type',
        path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
      )
      response.end(await readFile(file))
    } else {
      response.writeHead(404).end()
    }
  } catch (cause) {
    response.writeHead(500).end(String(cause))
  }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')

// A page CDP session tunnels requests to its real Worker; every remote inspection handle is released.
const inspectWorker = async (session, targetId) => {
  const {sessionId: attached} = await session.send('Target.attachToTarget', {
    flatten: false,
    targetId,
  })
  const pending = new Map()
  let sequence = 0
  const detached = ({sessionId}) => {
    if (sessionId === attached) {
      for (const request of pending.values()) {
        request.reject(new Error('Playback Worker closed during memory inspection'))
      }
      pending.clear()
    }
  }
  const receive = ({message, sessionId}) => {
    if (sessionId === attached) {
      const result = JSON.parse(message)
      const request = pending.get(result.id)
      if (request !== undefined) {
        pending.delete(result.id)
        if (result.error === undefined) {
          request.resolve(result.result)
        } else {
          request.reject(new Error(JSON.stringify(result.error)))
        }
      }
    }
  }
  session.on('Target.receivedMessageFromTarget', receive)
  session.on('Target.detachedFromTarget', detached)
  return {
    async close() {
      session.off('Target.receivedMessageFromTarget', receive)
      session.off('Target.detachedFromTarget', detached)
      await session.send('Target.detachFromTarget', {sessionId: attached})
    },
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        sequence += 1
        const id = sequence
        pending.set(id, {reject, resolve})
        session
          .send('Target.sendMessageToTarget', {
            message: JSON.stringify({id, method, params}),
            sessionId: attached,
          })
          .catch((cause) => {
            pending.delete(id)
            reject(cause)
          })
      }),
  }
}
const queryObjects = async (session, prototype, operation) => {
  const objectGroup = 'puppet-memory-inspection'
  try {
    const {result} = await session.send('Runtime.evaluate', {expression: prototype, objectGroup})
    assert(result.objectId, `Missing ${prototype}`)
    const {objects} = await session.send('Runtime.queryObjects', {
      objectGroup,
      prototypeObjectId: result.objectId,
    })
    const response = await session.send('Runtime.callFunctionOn', {
      functionDeclaration: operation,
      objectId: objects.objectId,
      returnByValue: true,
    })
    assert(!response.exceptionDetails, 'Memory inspection failed')
    return response.result.value
  } finally {
    await session.send('Runtime.releaseObjectGroup', {objectGroup})
  }
}
const sampleHeap = async (session) => {
  await session.send('HeapProfiler.collectGarbage')
  const heap = await session.send('Runtime.getHeapUsage')
  const wasmBytes = await queryObjects(
    session,
    'WebAssembly.Memory.prototype',
    'function() { return Array.from(this, memory => memory.buffer.byteLength) }',
  )
  return {...heap, wasmBytes}
}
const positiveControl = async (session) => {
  const before = await sampleHeap(session)
  await session.send('Runtime.evaluate', {
    expression: 'globalThis.__puppetMemoryControl = new ArrayBuffer(8 * 1024 * 1024); undefined',
  })
  const retained = await sampleHeap(session)
  await session.send('Runtime.evaluate', {expression: 'delete globalThis.__puppetMemoryControl'})
  const released = await sampleHeap(session)
  assert(
    retained.backingStorageSize - before.backingStorageSize >= 8 * MEBIBYTE,
    'Detector missed the retained control buffer',
  )
  assert(
    released.backingStorageSize - before.backingStorageSize <= limits.backingStorage,
    'Control buffer did not recover',
  )
  return {before, released, retained}
}
let browser
const report = {
  configuration,
  errors: [],
  hashes: {
    model: sha256(model),
    player: sha256(player),
    worker: sha256(await readFile(new URL(`dist/${workerPath}`, root))),
  },
  lifecycle: [],
  limits,
  passed: false,
  samples: [],
}
const started = Date.now()
try {
  browser = await chromium.launch({args: ['--use-angle=metal'], channel: 'chrome', headless: true})
  const page = await browser.newPage({deviceScaleFactor: 1, viewport: {height: 700, width: 900}})
  const workers = new Set()
  page.on('worker', (worker) => {
    workers.add(worker)
    worker.once('close', () => workers.delete(worker))
  })
  page.on('pageerror', (cause) => report.errors.push(cause.message))
  page.setDefaultTimeout(120000)
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  const evaluatePage = async (callback, input) => {
    const signal = AbortSignal.timeout(120000)
    let expired
    const timeout = new Promise((_resolve, reject) => {
      expired = () => reject(signal.reason)
      signal.addEventListener('abort', expired, {once: true})
    })
    try {
      return await Promise.race([page.evaluate(callback, input), timeout])
    } finally {
      signal.removeEventListener('abort', expired)
    }
  }
  const session = await page.context().newCDPSession(page)
  await session.send('HeapProfiler.enable')
  report.metadata = await evaluatePage(
    async (configuration) => {
      const {createMemoryFixture} = await import('/fixture.js')
      return createMemoryFixture(configuration)
    },
    {...configuration, workerPath},
  )
  const {targetInfos} = await session.send('Target.getTargets')
  const target = targetInfos.find((info) => info.type === 'worker' && info.url.endsWith(workerPath))
  assert(target, 'Playback Worker target was not found')
  const inspector = await inspectWorker(session, target.targetId)
  await inspector.send('HeapProfiler.enable')
  try {
    report.control = await positiveControl(inspector)
    await evaluatePage(
      (count) => globalThis.memoryFixture.advance(count),
      configuration.warmupFrames,
    )
    let completed = 0
    for (const checkpoint of [
      0,
      Math.floor(configuration.frames / 4),
      Math.floor(configuration.frames / 2),
      configuration.frames,
    ]) {
      const progress = await evaluatePage(
        (count) => globalThis.memoryFixture.advance(count),
        checkpoint - completed,
      )
      completed = checkpoint
      const sample = {
        completed,
        main: await sampleHeap(session),
        progress,
        worker: await sampleHeap(inspector),
      }
      report.samples.push(sample)
      console.log(JSON.stringify({phase: 'frames', ...sample}))
    }
    const [baseline] = report.samples
    assert(baseline.worker.wasmBytes.length <= 1, 'Unexpected number of numeric Wasm instances')
    report.numericKernel = baseline.worker.wasmBytes.length === 1 ? 'wasm' : 'javascript'
    for (const sample of report.samples.slice(1)) {
      assert(
        sample.worker.usedSize - baseline.worker.usedSize <= limits.workerHeap,
        'Worker retained JS heap exceeds budget',
      )
      assert(
        sample.worker.backingStorageSize - baseline.worker.backingStorageSize <=
          limits.backingStorage,
        'Worker retained backing storage exceeds budget',
      )
      assert.deepEqual(
        sample.worker.wasmBytes,
        baseline.worker.wasmBytes,
        'Wasm linear memory grew after warmup',
      )
      assert(
        sample.main.usedSize - baseline.main.usedSize <= limits.mainHeap,
        'Host transport retained heap exceeds budget',
      )
      assert.equal(sample.progress.pendingRequests, 0)
    }
  } finally {
    await inspector.close()
    const closed = [...workers].map((worker) =>
      once(worker, 'close', {signal: AbortSignal.timeout(30000)}),
    )
    await evaluatePage(() => {
      globalThis.memoryFixture.disposeWorker()
      delete globalThis.memoryFixture.advance
      delete globalThis.memoryFixture.disposeWorker
    })
    await Promise.all(closed)
  }
  report.display = []
  const sampleDisplay = async (count) => {
    const frames = await evaluatePage(
      (count) => globalThis.memoryFixture.advancePlayback(count),
      count,
    )
    const sample = {frames, main: await sampleHeap(session)}
    report.display.push(sample)
    console.log(JSON.stringify({phase: 'display', ...sample}))
  }
  await sampleDisplay(300)
  await sampleDisplay(Math.floor(configuration.displayFrames / 2))
  await sampleDisplay(Math.ceil(configuration.displayFrames / 2))
  const [displayBaseline] = report.display
  for (const sample of report.display.slice(1)) {
    assert(
      sample.main.usedSize - displayBaseline.main.usedSize <= limits.mainHeap,
      'Playback display retains JS heap beyond budget',
    )
    assert(
      sample.main.backingStorageSize - displayBaseline.main.backingStorageSize <=
        limits.backingStorage,
      'Playback display backing storage exceeds budget',
    )
  }
  const displayClosed = [...workers].map((worker) =>
    once(worker, 'close', {signal: AbortSignal.timeout(30000)}),
  )
  await evaluatePage(() => globalThis.memoryFixture.disposePlayback())
  await Promise.all(displayClosed)
  for (let cycle = 0; cycle <= configuration.cycles; cycle += 1) {
    const closing = []
    const observe = (worker) =>
      closing.push(once(worker, 'close', {signal: AbortSignal.timeout(30000)}))
    page.on('worker', observe)
    try {
      await evaluatePage((cycle) => globalThis.memoryFixture.lifecycle(cycle), cycle)
    } finally {
      page.off('worker', observe)
    }
    await Promise.all(closing)
    assert.equal(workers.size, 0, 'A disposed playback Worker remained alive')
    if (cycle === 0 || cycle === configuration.cycles || cycle % 5 === 0) {
      const sample = {
        contexts: await queryObjects(
          session,
          'WebGL2RenderingContext.prototype',
          'function() { return this.length }',
        ),
        cycle,
        dom: await session.send('Memory.getDOMCounters'),
        main: await sampleHeap(session),
      }
      report.lifecycle.push(sample)
      console.log(JSON.stringify({phase: 'lifecycle', ...sample}))
    }
    if (cycle === 0) {
      await session.send('HeapProfiler.startSampling', {samplingInterval: 16384})
    }
  }
  const {profile} = await session.send('HeapProfiler.stopSampling')
  report.retainedAllocations = profile
  const [baseline] = report.lifecycle
  report.retainedDom = {
    canvases: await queryObjects(
      session,
      'HTMLCanvasElement.prototype',
      `function() {
      return Array.from(this, canvas => ({width: canvas.width, height: canvas.height, connected: canvas.isConnected}))
    }`,
    ),
    images: await queryObjects(
      session,
      'HTMLImageElement.prototype',
      `function() {
      return Array.from(this, image => ({width: image.width, height: image.height, connected: image.isConnected}))
    }`,
    ),
  }
  if (report.lifecycle.some((sample) => sample.dom.nodes - baseline.dom.nodes > limits.nodes)) {
    const chunks = []
    const receiveChunk = ({chunk}) => chunks.push(chunk)
    session.on('HeapProfiler.addHeapSnapshotChunk', receiveChunk)
    try {
      await session.send('HeapProfiler.takeHeapSnapshot', {reportProgress: false})
      await writeFile(`${process.env.OUTPUT}.heapsnapshot`, chunks.join(''))
    } finally {
      session.off('HeapProfiler.addHeapSnapshotChunk', receiveChunk)
    }
  }
  for (const sample of report.lifecycle.slice(1)) {
    assert(
      sample.main.usedSize - baseline.main.usedSize <= limits.mainHeap,
      'Disposed players retain JS heap beyond budget',
    )
    assert(
      sample.main.backingStorageSize - baseline.main.backingStorageSize <= limits.backingStorage,
      'Disposed players retain backing storage beyond budget',
    )
    assert(
      sample.dom.nodes - baseline.dom.nodes <= limits.nodes,
      'Disposed canvases retain DOM nodes',
    )
    assert(
      sample.dom.jsEventListeners - baseline.dom.jsEventListeners <= limits.listeners,
      'Disposed players retain listeners',
    )
    assert.equal(sample.contexts, baseline.contexts, 'Disposed WebGL contexts accumulate')
  }
  assert.deepEqual(report.errors, [], 'Browser errors occurred')
  report.workersAfterDestroy = workers.size
  report.passed = true
} catch (cause) {
  report.failure = String(cause.stack ?? cause)
  throw cause
} finally {
  report.elapsedMillis = Date.now() - started
  await writeFile(process.env.OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
  await browser?.close()
  await new Promise((resolve) => {
    server.close(resolve)
  })
}
