/* eslint-disable no-await-in-loop -- Serial runs prevent CPU/GPU contention between measurements. */
/**
 * Build the player first, then run with MODEL=/absolute/model.poffo node this-file.mjs.
 * CPU_RATES=1,4 RUNS=2 MODES=main,worker RESOLUTION=1 ANTIALIASING=msaa are defaults.
 * CDP CPU throttling targets the main thread; this does not reproduce a low-end device.
 * WARMUP_MS=2000 MEASURE_MS=5000 control readiness warmup and sampling duration.
 * PLAYER_ROOT optionally selects a package artifact directory using a file: URL.
 * MOTION selects a motion id; omitted, use the first motion.
 * PROFILE_DIR optionally records the page and playback Worker CPU profiles.
 * OUTPUT chooses the JSON destination. The model is read locally and never uploaded.
 */
import {createServer} from 'node:http'
import {readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {capturePlaybackProfile} from './capture-playback-profile.mjs'

const DEFAULT_MEASURE_MILLIS = 5000
const DEFAULT_WARMUP_MILLIS = 2000
const DEFAULT_RANDOM_SEED = 42
const NOT_FOUND = 404
const SERVER_ERROR = 500
const metric = (response, name) => response.metrics.find((entry) => entry.name === name)?.value ?? 0
const packageRoot =
  process.env.PLAYER_ROOT === undefined
    ? new URL('../', import.meta.url)
    : new URL(process.env.PLAYER_ROOT)
const modelPath = process.env.MODEL
if (modelPath === undefined) {
  throw new Error('MODEL must name a local .poffo or JSON model')
}
const model = await readFile(modelPath)
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end(
        '<!doctype html><title>Puppet playback benchmark</title><canvas width="900" height="700"></canvas>',
      )
    } else if (path === '/model') {
      response.end(model)
    } else if (path.startsWith('/dist/')) {
      const asset = new URL(`.${path}`, packageRoot)
      if (!asset.href.startsWith(new URL('dist/', packageRoot).href)) {
        throw new Error('Invalid asset path')
      }
      response.setHeader(
        'Content-Type',
        path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
      )
      response.end(await readFile(asset))
    } else {
      response.writeHead(NOT_FOUND).end()
    }
  } catch (error) {
    response.writeHead(SERVER_ERROR).end(String(error))
  }
})
await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', resolve)
})
const browser = await chromium.launch({
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
  channel: process.env.CHANNEL ?? 'chrome',
  headless: false,
})
const configuration = {
  antialiasing: process.env.ANTIALIASING ?? 'msaa',
  cpuRates: (process.env.CPU_RATES ?? '1,4').split(',').map(Number),
  measureMillis: Number(process.env.MEASURE_MS ?? DEFAULT_MEASURE_MILLIS),
  model: modelPath,
  modes: (process.env.MODES ?? 'main,worker').split(','),
  motion: process.env.MOTION,
  randomSeed: Number(process.env.RANDOM_SEED ?? DEFAULT_RANDOM_SEED),
  resolution: Number(process.env.RESOLUTION ?? 1),
  runs: Number(process.env.RUNS ?? 2),
  viewport: {height: 700, width: 900},
  warmupMillis: Number(process.env.WARMUP_MS ?? DEFAULT_WARMUP_MILLIS),
}
const results = []
try {
  for (const cpu of configuration.cpuRates) {
    for (let run = 0; run < configuration.runs; run += 1) {
      const modes = run % 2 === 0 ? configuration.modes : configuration.modes.toReversed()
      for (const computation of modes) {
        const page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: configuration.viewport,
        })
        const session = await page.context().newCDPSession(page)
        await session.send('Emulation.setCPUThrottlingRate', {rate: cpu})
        await session.send('Performance.enable')
        await page.goto(`http://127.0.0.1:${server.address().port}`)
        const metadata = await page.evaluate(
          async (options) => {
            const api = await import('/dist/player.js')
            const parsed = await api.parseDocumentBlob({
              source: await (await fetch('/model')).blob(),
            })
            if (!parsed.ok) {
              throw new Error('Invalid benchmark model')
            }
            const state = {errors: [], published: 0}
            state.player = await api.createPlayer({
              antialiasing: options.antialiasing,
              buffering: options.computation === 'worker',
              canvas: document.querySelector('canvas'),
              document: parsed.document,
              motionId: options.motion ?? parsed.document.motions[0]?.id,
              onBufferingChange: (info) => {
                if (info.status === 'error') {
                  state.errors.push('Worker failed')
                }
              },
              onFrame: () => {
                state.published += 1
              },
              randomSeed: options.randomSeed,
              renderer: 'webgl',
              resizeTo: document.documentElement,
              resolution: options.resolution,
            })
            globalThis.playbackBenchmark = state
            state.player.play({loop: true})
            await new Promise((resolve) => {
              let start
              const warmup = (timestamp) => {
                start ??= timestamp
                if (timestamp - start >= options.warmupMillis) {
                  resolve()
                } else {
                  requestAnimationFrame(warmup)
                }
              }
              requestAnimationFrame(warmup)
            })
            const buffering = api.getPlayerBufferingInfo?.(state.player) ?? {status: 'disabled'}
            if (
              options.computation === 'worker' &&
              buffering.status !== 'active' &&
              buffering.status !== 'idle'
            ) {
              throw new Error(`Worker benchmark fell back: ${buffering.status}`)
            }
            const model = parsed.document
            const canvas = document.querySelector('canvas')
            const canvasSize = {height: canvas.height, width: canvas.width}
            const expected = {
              height: options.viewport.height * options.resolution,
              width: options.viewport.width * options.resolution,
            }
            if (canvasSize.width !== expected.width || canvasSize.height !== expected.height) {
              throw new Error(
                `Unexpected benchmark canvas: ${JSON.stringify(canvasSize)}; expected ${JSON.stringify(expected)}`,
              )
            }
            return {
              buffering,
              canvasSize,
              chains: model.physics?.chains?.length ?? 0,
              hardwareConcurrency: navigator.hardwareConcurrency,
              motion: options.motion ?? model.motions[0]?.id,
              parameters: model.parameters?.length ?? 0,
              parts: model.parts.length,
              userAgent: navigator.userAgent,
              vertices: model.parts.reduce((sum, part) => sum + part.mesh.vertices.length / 2, 0),
            }
          },
          {...configuration, computation},
        )
        const capture =
          process.env.PROFILE_DIR === undefined
            ? undefined
            : await capturePlaybackProfile({
                computation,
                directory: process.env.PROFILE_DIR,
                name: `${computation}-cpu-${cpu}-run-${run + 1}`,
                session,
              })
        const before = await session.send('Performance.getMetrics')
        const measurement = await page.evaluate(
          async (options) => {
            const MILLISECONDS_PER_SECOND = 1000
            const P95 = 0.95
            const state = globalThis.playbackBenchmark
            const {published} = state
            let previousPublished = published
            let shown = 0
            let start
            let previous
            const intervals = []
            const elapsed = await new Promise((resolve) => {
              const sample = (timestamp) => {
                start ??= timestamp
                if (previous !== undefined) {
                  intervals.push(timestamp - previous)
                  if (state.published !== previousPublished) {
                    shown += 1
                  }
                }
                previous = timestamp
                previousPublished = state.published
                if (timestamp - start >= options.measureMillis) {
                  resolve(timestamp - start)
                } else {
                  requestAnimationFrame(sample)
                }
              }
              requestAnimationFrame(sample)
            })
            const sorted = intervals.toSorted((left, right) => left - right)
            return {
              duration: elapsed,
              errors: state.errors,
              frameP95: sorted[Math.floor(sorted.length * P95)],
              observedModelFPS: (shown * MILLISECONDS_PER_SECOND) / elapsed,
              rafFPS: (intervals.length * MILLISECONDS_PER_SECOND) / elapsed,
              updatedFPS: ((state.published - published) * MILLISECONDS_PER_SECOND) / elapsed,
            }
          },
          {measureMillis: configuration.measureMillis},
        )
        const after = await session.send('Performance.getMetrics')
        const profiles = await capture?.stop()
        const result = {
          computation,
          cpu,
          profiles,
          run: run + 1,
          ...metadata,
          ...measurement,
          heapBytes: metric(after, 'JSHeapUsedSize'),
          scriptSeconds: metric(after, 'ScriptDuration') - metric(before, 'ScriptDuration'),
          taskSeconds: metric(after, 'TaskDuration') - metric(before, 'TaskDuration'),
        }
        results.push(result)
        process.stdout.write(`${JSON.stringify(result)}\n`)
        await page.evaluate(() => globalThis.playbackBenchmark.player.destroy())
        await page.close()
      }
    }
  }
  const output =
    process.env.OUTPUT ?? fileURLToPath(new URL('./playback-results.json', import.meta.url))
  await writeFile(output, `${JSON.stringify({configuration, results}, null, 2)}\n`)
} finally {
  await browser.close()
  await new Promise((resolve) => {
    server.close(resolve)
  })
}
