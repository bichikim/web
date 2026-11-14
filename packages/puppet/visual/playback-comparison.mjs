/* eslint-disable no-await-in-loop -- Ordered controls and serial GPU ownership are part of the comparison. */
/**
 * Build both artifacts, then set MODEL, BASELINE_ROOT and OUTPUT before running this file.
 * CANDIDATE_ROOT defaults to this package. Uses hardware rendering by default;
 * COMPARISON_BACKEND=software selects SwiftShader. The model stays on localhost.
 * REFERENCE_COMPUTATION=main compares native controls against the candidate Worker.
 * ANTIALIASING=msaa also checks multisampled rendering; ssaa is the default.
 * The baseline is explicitly submitted; the candidate must submit its own redraw.
 */
import {createHash} from 'node:crypto'
import {once} from 'node:events'
import {readFile, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {resolve, sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const NOT_FOUND = 404
const SERVER_ERROR = 500
const WORKER_CLOSE_MILLIS = 30000
const BROWSER_OPERATION_MILLIS = 120000
const {MODEL, BASELINE_ROOT, OUTPUT} = process.env
const backend = process.env.COMPARISON_BACKEND ?? 'hardware'
const referenceComputation = process.env.REFERENCE_COMPUTATION ?? 'worker'
const antialiasing = process.env.ANTIALIASING ?? 'ssaa'
if (referenceComputation !== 'main' && referenceComputation !== 'worker') {
  throw new Error('REFERENCE_COMPUTATION must be main or worker')
}
if (antialiasing !== 'ssaa' && antialiasing !== 'msaa') {
  throw new Error('ANTIALIASING must be ssaa or msaa')
}
if (backend !== 'hardware' && backend !== 'software') {
  throw new Error('COMPARISON_BACKEND must be hardware or software')
}
const expectedRenderer =
  backend === 'software' ? 'SwiftShader' : process.platform === 'darwin' ? 'Metal' : 'ANGLE'
if (MODEL === undefined || BASELINE_ROOT === undefined || OUTPUT === undefined) {
  throw new Error('MODEL, BASELINE_ROOT and OUTPUT are required')
}
const roots = {
  after: resolve(process.env.CANDIDATE_ROOT ?? fileURLToPath(new URL('../', import.meta.url))),
  before: resolve(BASELINE_ROOT),
}
const model = await readFile(MODEL)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><title>Puppet playback comparison</title>')
    } else if (path === '/model') {
      response.end(model)
    } else {
      const [variant, ...segments] = path.slice(1).split('/')
      if (!Object.hasOwn(roots, variant) || segments[0] !== 'dist') {
        response.writeHead(NOT_FOUND).end()
        return
      }
      const file = resolve(roots[variant], ...segments)
      if (!file.startsWith(`${resolve(roots[variant], 'dist')}${sep}`)) {
        throw new Error('Invalid artifact path')
      }
      response.setHeader(
        'Content-Type',
        file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
      )
      response.end(await readFile(file))
    }
  } catch (error) {
    response.writeHead(SERVER_ERROR).end(String(error))
  }
})
await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', resolve)
})
let browser
try {
  browser = await chromium.launch({
    args:
      backend === 'software'
        ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        : process.platform === 'darwin'
          ? ['--use-gl=angle', '--use-angle=metal']
          : [],
    channel: 'chrome',
    headless: true,
  })
  const page = await browser.newPage({deviceScaleFactor: 1, viewport: {height: 700, width: 900}})
  const evaluatePage = async (...args) => {
    const signal = AbortSignal.timeout(BROWSER_OPERATION_MILLIS)
    let expired
    const aborted = new Promise((_resolve, reject) => {
      expired = () => reject(signal.reason)
      signal.addEventListener('abort', expired, {once: true})
    })
    try {
      return await Promise.race([page.evaluate(...args), aborted])
    } finally {
      signal.removeEventListener('abort', expired)
    }
  }
  const errors = []
  const workers = new Set()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('worker', (worker) => {
    workers.add(worker)
    worker.once('close', () => workers.delete(worker))
  })
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await evaluatePage(() => {
    // Ordered model inputs stay literal so this test scenario is straightforward to replay.
    /* eslint-disable no-magic-numbers */
    globalThis.playbackComparisonTools = {
      async applyScenario(entry, stage) {
        const {api, player} = entry
        const parameters = entry.document.parameters
          .filter((parameter) => parameter.maximum > parameter.minimum)
          .slice(0, 6)
        switch (stage) {
          case 'defaults':
            return
          case 'controls': {
            for (const [index, parameter] of parameters.entries()) {
              player.setParameterValue(
                parameter.id,
                parameter.minimum +
                  (parameter.maximum - parameter.minimum) * (index % 2 === 0 ? 0.35 : 0.65),
              )
            }
            player.setModelOpacity(0.75)
            player.setPartOverride(entry.document.parts[0].id, {
              multiplyColor: [0.8, 0.7, 0.9],
              opacity: 0.6,
              screenColor: [0.1, 0.05, 0],
            })
            player.seek(0.7)
            return
          }
          case 'burst': {
            const [parameter] = parameters
            if (parameter !== undefined) {
              for (let index = 0; index < 16; index += 1) {
                player.setParameterValue(
                  parameter.id,
                  parameter.minimum + ((parameter.maximum - parameter.minimum) * index) / 30,
                )
              }
            }
            player.setModelOpacity(0.65)
            player.seek(1.3)
            return
          }
          case 'document-edit': {
            const parsed = api.parseDocumentValue({
              ...entry.document,
              parts: entry.document.parts.map((part, index) =>
                index === 0 ? {...part, properties: {...part.properties, opacity: 0.45}} : part,
              ),
            })
            if (!parsed.ok || !player.updateDocument(parsed.document)) {
              throw new Error('Document edit rejected')
            }
            entry.document = parsed.document
            player.clearParameterValues()
            player.setPartOverride(entry.document.parts[0].id)
            player.resetMotionHistory()
            player.resetPhysics()
            return
          }
          case 'buffer-off':
          case 'buffer-on': {
            await api.configurePlayerBuffering(player, {enabled: stage === 'buffer-on'})
            return
          }
          case 'resize': {
            player.resize(2)
            return
          }
          case 'renderer': {
            const canvas = document.createElement('canvas')
            document.body.append(canvas)
            const changed = await player.configureRenderer({
              antialiasing: globalThis.playbackComparisonSettings.antialiasing,
              canvas,
              renderer: 'webgl',
            })
            if (changed !== 'applied') {
              throw new Error(`Renderer replacement: ${changed}`)
            }
            entry.canvas = canvas
            return
          }
          default:
            throw new Error(`Unknown stage: ${stage}`)
        }
      },
      /* eslint-enable no-magic-numbers */
      awaitWorker(entry) {
        const WORKER_READY_MILLIS = 30000
        const {api, player} = entry
        return new Promise((resolve, reject) => {
          const signal = AbortSignal.timeout(WORKER_READY_MILLIS)
          const done = (error) => {
            entry.listeners.delete(check)
            signal.removeEventListener('abort', expired)
            if (error === undefined) {
              resolve()
            } else {
              reject(error)
            }
          }
          const expired = () => done(signal.reason)
          const check = () => {
            const {status} = api.getPlayerBufferingInfo(player)
            if (status === 'idle' || status === 'active') {
              done()
            } else if (status !== 'preparing') {
              done(new Error(`Worker status: ${status}`))
            }
          }
          entry.listeners.add(check)
          signal.addEventListener('abort', expired, {once: true})
          check()
        })
      },
      serialize(value) {
        return JSON.stringify(value, (_key, item) => {
          if (item instanceof Map) {
            return [...item]
          }
          return item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            !ArrayBuffer.isView(item)
            ? Object.fromEntries(
                Object.keys(item)
                  .sort()
                  .map((key) => [key, item[key]]),
              )
            : item
        })
      },
    }
  })
  const metadata = await evaluatePage(
    async ({antialiasing, expectedRenderer, referenceComputation}) => {
      globalThis.playbackComparisonSettings = {antialiasing, referenceComputation}
      const originalWorker = globalThis.Worker
      const frames = new Map()
      globalThis.Worker = class extends originalWorker {
        constructor(url, options) {
          super(url, options)
          const [, variant] = new URL(url, location.href).pathname.split('/')
          const parts = []
          const layers = []
          // Decode the wire layout independently of the production decoder before comparing semantics.
          /* eslint-disable no-magic-numbers */
          const unpack = (frame) => {
            if (frame.partTemplates === undefined) {
              return frame
            }
            frame.partTemplates.forEach(([index, value]) => {
              parts[index] = value
            })
            frame.layerTemplates.forEach(([index, value]) => {
              layers[index] = value
            })
            const colors = (values, offset) => ({
              multiplyColor: Array.from(values.slice(offset + 1, offset + 4)),
              opacity: values[offset],
              screenColor: Array.from(values.slice(offset + 4, offset + 7)),
            })
            const plans = []
            for (let offset = 0; offset < frame.parts.length; offset += 10) {
              const template = parts[frame.parts[offset]]
              plans.push({
                ...template,
                properties: {...template.properties, ...colors(frame.parts, offset + 3)},
                render: frame.parts[offset + 1] === 1,
                visible: frame.parts[offset + 2] === 1,
              })
            }
            const restored = new Map()
            for (let offset = 0; offset < frame.layers.length; offset += 9) {
              const template = layers[frame.layers[offset]]
              restored.set(template.groupId, {
                ...template,
                properties: {...template.properties, ...colors(frame.layers, offset + 2)},
                visible: frame.layers[offset + 1] === 1,
              })
            }
            return {layers: restored, plans, spatialPoses: frame.spatialPoses}
          }
          /* eslint-enable no-magic-numbers */
          this.addEventListener('message', ({data}) => {
            if (data.kind === 'produced' && data.frame.kind === 'frame') {
              const computed = structuredClone(data.frame.computed)
              frames.set(variant, {
                ...computed,
                frame: unpack(computed.frame),
                playback: data.frame.playback,
                state: data.frame.state,
                vertices: new Uint32Array(computed.vertices.buffer),
              })
            }
          })
        }
      }
      const source = await (await fetch('/model')).blob()
      const entries = []
      for (const variant of ['before', 'after']) {
        const api = await import(`/${variant}/dist/player.js`)
        const parsed = await api.parseDocumentBlob({source})
        if (!parsed.ok) {
          throw new Error('Invalid comparison model')
        }
        const canvas = document.createElement('canvas')
        document.body.append(canvas)
        const listeners = new Set()
        const player = await api.createPlayer({
          antialiasing,
          buffering: variant === 'after' || referenceComputation === 'worker',
          canvas,
          document: parsed.document,
          onBufferingChange: () => listeners.forEach((listener) => listener()),
          physicsPreview: false,
          randomSeed: 42,
          renderer: 'webgl',
          resizeTo: document.documentElement,
          resolution: 1,
        })
        player.pause()
        player.stop()
        player.setEyeBlink(false)
        player.setBreath(false)
        const reset = await api.parseDocumentBlob({source})
        if (!reset.ok) {
          throw new Error('Invalid reset document')
        }
        const defaults = Object.fromEntries(
          reset.document.parameters.map((parameter) => [parameter.id, parameter.defaultValue]),
        )
        if (!player.updateDocument(reset.document, defaults)) {
          throw new Error('Document reset rejected')
        }
        player.resetMotionHistory()
        player.resetPhysics()
        await api.flushPlayerInputs(player)
        entries.push({api, canvas, document: reset.document, listeners, player, variant})
      }
      globalThis.playbackComparison = {entries, frames, referenceComputation}
      return entries.map(({canvas, document, player}) => {
        const gl = canvas.getContext('webgl2')
        const extension = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer =
          extension === null ? undefined : gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
        if (!renderer?.includes(expectedRenderer)) {
          throw new Error(`Unexpected reference renderer: ${renderer}`)
        }
        return {parts: document.parts.length, renderer, rendering: player.getRenderingInfo()}
      })
    },
    {antialiasing, expectedRenderer, referenceComputation},
  )
  const results = []
  for (const stage of [
    'defaults',
    'controls',
    'burst',
    'document-edit',
    'buffer-off',
    'buffer-on',
    'resize',
    'renderer',
  ]) {
    const result = await evaluatePage(async (stage) => {
      const {entries, frames, referenceComputation} = globalThis.playbackComparison
      const {applyScenario, awaitWorker, serialize} = globalThis.playbackComparisonTools
      for (const entry of entries) {
        const {api, player} = entry
        await applyScenario(entry, stage)
        if (referenceComputation === 'main' && entry.variant === 'before') {
          await api.configurePlayerBuffering(player, {enabled: false})
        }
        const applied = await api.flushPlayerInputs(player)
        if (applied !== 'applied') {
          throw new Error(`Controls were not submitted: ${applied}`)
        }
        if (
          stage !== 'buffer-off' &&
          (referenceComputation === 'worker' || entry.variant === 'after')
        ) {
          await awaitWorker(entry)
        }
      }
      const images = entries.map(({canvas, player}, index) => {
        player.redraw()
        if (index === 0) {
          // Observe the old artifact after submission without masking a candidate regression.
          canvas.getContext('webgl2').flush()
        }
        const copy = document.createElement('canvas')
        copy.width = canvas.width
        copy.height = canvas.height
        const context = copy.getContext('2d', {willReadFrequently: true})
        context.drawImage(canvas, 0, 0)
        return {
          height: copy.height,
          pixels: context.getImageData(0, 0, copy.width, copy.height).data,
          width: copy.width,
        }
      })
      if (images[0].width !== images[1].width || images[0].height !== images[1].height) {
        throw new Error('Canvas dimensions differ')
      }
      const RGBA_CHANNEL_COUNT = 4
      const ALPHA_CHANNEL_INDEX = 3
      let differentChannels = 0
      let maximumDelta = 0
      let visiblePixels = 0
      for (let index = 0; index < images[0].pixels.length; index += 1) {
        const delta = Math.abs(images[0].pixels[index] - images[1].pixels[index])
        if (delta !== 0) {
          differentChannels += 1
        }
        maximumDelta = Math.max(maximumDelta, delta)
        if (index % RGBA_CHANNEL_COUNT === ALPHA_CHANNEL_INDEX && images[0].pixels[index] !== 0) {
          visiblePixels += 1
        }
      }
      const controlsEqual =
        serialize(entries[0].player.getParameterValues()) ===
        serialize(entries[1].player.getParameterValues())
      const workerEqual =
        stage === 'buffer-off' || referenceComputation === 'main'
          ? null
          : frames.size === 2 && serialize(frames.get('before')) === serialize(frames.get('after'))
      const statuses = entries.map(({api, player}) => api.getPlayerBufferingInfo(player).status)
      return {
        controlsEqual,
        differentChannels,
        height: images[0].height,
        maximumDelta,
        stage,
        statuses,
        visiblePixels,
        width: images[0].width,
        workerEqual,
      }
    }, stage)
    results.push(result)
    console.log(JSON.stringify(result))
  }
  const closed = Promise.all(
    [...workers].map((worker) =>
      once(worker, 'close', {signal: AbortSignal.timeout(WORKER_CLOSE_MILLIS)}),
    ),
  )
  await evaluatePage(() =>
    globalThis.playbackComparison.entries.forEach(({player}) => player.destroy()),
  )
  await closed
  const artifactHashes = Object.fromEntries(
    await Promise.all(
      Object.entries(roots).map(async ([name, root]) => [
        name,
        sha256(await readFile(resolve(root, 'dist/player.js'))),
      ]),
    ),
  )
  const successful = results.every((result) => {
    const expected = result.stage === 'buffer-off' ? ['disabled'] : ['idle', 'active']
    const ready = result.statuses.every((status, index) =>
      referenceComputation === 'main' && index === 0
        ? status === 'disabled'
        : expected.includes(status),
    )
    return (
      ready &&
      result.differentChannels === 0 &&
      result.visiblePixels > 0 &&
      result.controlsEqual &&
      result.workerEqual !== false
    )
  })
  const passed = errors.length === 0 && workers.size === 0 && successful
  const report = {
    antialiasing,
    artifactHashes,
    backend,
    errors,
    metadata,
    model: MODEL,
    modelSHA256: sha256(model),
    passed,
    referenceComputation,
    results,
    workersAfterDestroy: workers.size,
  }
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
  if (!passed) {
    throw new Error(`Playback comparison failed; see ${OUTPUT}`)
  }
} finally {
  await browser?.close()
  await new Promise((resolve) => {
    server.close(resolve)
  })
}
