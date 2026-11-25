import {createGeometryService} from './create-geometry-service'
import {createGpuQueue} from './create-queue'
import initialize, {CanvasRenderer} from './wasm/runtime'
import type {AlphaResponse, DrawRequest, GpuRequest, GpuResponse} from './types'
let renderer: CanvasRenderer | undefined
let canvas: OffscreenCanvas | undefined
let direct = false
let configuredView: DrawRequest['view'] | undefined
const run = createGpuQueue()
const geometry = createGeometryService({
  onError: (cause) => self.postMessage({id: 0, kind: 'error', message: cause.message}),
  renderer: () => renderer,
  run,
})

const sendAlpha = async (active: CanvasRenderer, request: DrawRequest) => {
  const {alpha, id} = request
  if (alpha === undefined) {
    return
  }
  try {
    const pixels: unknown = await active.take_alpha()
    if (!(pixels instanceof Uint8Array) || pixels.length !== alpha.width * alpha.height) {
      throw new Error('GPU alpha sample is unavailable')
    }
    const data = {id, kind: 'alpha', sample: {...alpha, data: pixels}} satisfies AlphaResponse
    self.postMessage(data, {transfer: [pixels.buffer]})
  } catch (cause) {
    const data = {
      id,
      kind: 'alpha-error',
      message: cause instanceof Error ? cause.message : String(cause),
    } satisfies AlphaResponse
    self.postMessage(data)
  }
}
const handle = async (message: GpuRequest) => {
  switch (message.kind) {
    case 'initialize': {
      try {
        await initialize()
        geometry.destroy()
        await run(() => renderer?.free())
        canvas = message.surface ?? new OffscreenCanvas(message.width, message.height)
        direct = message.surface !== undefined
        configuredView = undefined
        renderer = await run(() =>
          CanvasRenderer.create(
            canvas,
            message.width,
            message.height,
            message.metadata,
            message.samples,
            message.alphaCapture,
          ),
        )
        message.textures.forEach((image) => renderer!.texture(image))
        const response: GpuResponse = {id: message.id, kind: 'initialized'}
        self.postMessage(response)
      } finally {
        message.textures.forEach((image) => image.close())
      }
      return
    }
    case 'draw': {
      if (renderer === undefined || canvas === undefined) {
        throw new Error('GPU renderer is not initialized')
      }
      const active = renderer
      const surface = canvas
      const previousView = configuredView
      const needsResize = surface.width !== message.width || surface.height !== message.height
      if (
        needsResize ||
        previousView === undefined ||
        message.view.some((value, index) => !Object.is(value, previousView[index]))
      ) {
        await run(() => {
          if (needsResize) {
            surface.width = message.width
            surface.height = message.height
            active.resize(message.width, message.height)
          }
          active.view(...message.view)
        })
        configuredView = message.view
      }
      const vertices =
        message.geometry === undefined
          ? message.vertices
          : await geometry.draw(message.geometry, message.display, message.alpha)
      if (message.geometry === undefined) {
        await run(() => {
          if (message.alpha !== undefined) {
            active.request_alpha(message.alpha.width, message.alpha.height)
          }
          active.draw(vertices, message.display)
        })
      }
      const bitmap = direct ? null : surface.transferToImageBitmap()
      try {
        const response: GpuResponse = {
          bitmap,
          display: message.display,
          id: message.id,
          kind: 'rendered',
          vertices,
          ...(message.geometry === undefined ? {} : {geometry: message.geometry}),
        }
        self.postMessage(response, {
          transfer:
            bitmap === null
              ? [vertices.buffer, message.display.buffer]
              : [bitmap, vertices.buffer, message.display.buffer],
        })
      } catch (cause) {
        bitmap?.close()
        throw cause
      }
      sendAlpha(active, message)
      return
    }
    case 'connect':
      geometry.connect(message.owner, message.connection, message.port)
      self.postMessage({id: message.id, kind: 'connected'} satisfies GpuResponse)
      return
    case 'release-geometry':
      geometry.release(message.token)
      return
    case 'disconnect-geometry':
      geometry.disconnect(message.connection)
      return
    default: {
      const exhaustive: never = message
      throw new Error(`Unknown GPU message ${exhaustive}`)
    }
  }
}
let pending = Promise.resolve()
self.addEventListener('message', ({data}: MessageEvent<GpuRequest>) => {
  if (data.kind === 'release-geometry') {
    geometry.release(data.token)
    return
  }
  if (data.kind === 'disconnect-geometry') {
    geometry.disconnect(data.connection)
    return
  }
  pending = pending
    .then(() => handle(data))
    .catch((cause: unknown) => {
      const response: GpuResponse = {
        id: data.id,
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      }
      self.postMessage(response)
    })
})
