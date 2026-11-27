import {createGeometryConnections} from './create-geometry-connections'
import type {GeometryConnection, GeometryToken} from '../../geometry/types'
import type {FrameAlphaSize, PlayerAlphaCapture} from '../../rendering-options'
import type {AlphaResponse, DrawGpu, GpuCommand, GpuResponse, InitializeGpu} from './types'
export interface GpuClient {
  readonly cancelAlpha: () => void
  readonly connectGeometry: () => Promise<GeometryConnection>
  readonly releaseGeometry: (token: GeometryToken) => void
  readonly initialize: (command: InitializeGpu) => Promise<void>
  readonly uploadTextures: (textures: readonly ImageBitmap[]) => Promise<void>
  readonly draw: (command: DrawGpu) => Promise<ImageBitmap | null>
  readonly prefetch?: (command: DrawGpu) => Promise<ImageBitmap | null> | undefined
  readonly destroy: () => void
}
interface PendingRequest {
  readonly reject: (cause: Error) => void
  readonly resolve: (response: GpuResponse) => void
}
const reusableBuffer = (buffer: Float32Array | undefined, length: number) =>
  buffer?.length === length ? buffer : new Float32Array(length)
const matchesGeometry = (received: GeometryToken | undefined, expected: GeometryToken) =>
  received?.owner === expected.owner &&
  received.connection === expected.connection &&
  received.frame === expected.frame
const createAlphaRequests = (capture?: PlayerAlphaCapture) => {
  let pending: {readonly id: number; cancelled: boolean} | undefined
  let reserved: FrameAlphaSize | undefined
  const requestSize = () => (pending === undefined ? capture?.requestSize() : undefined)
  return {
    begin(id: number) {
      pending = {cancelled: false, id}
    },
    cancel() {
      reserved = undefined
      if (pending !== undefined) {
        pending.cancelled = true
      }
    },
    canPrefetch() {
      // Reserve an alpha sample for a frame that has been selected for display.
      reserved ??= requestSize()
      return reserved === undefined
    },
    claim() {
      const size = reserved ?? requestSize()
      reserved = undefined
      return size
    },
    clear(id?: number) {
      if (id === undefined || pending?.id === id) {
        pending = undefined
      }
    },
    receive(response: AlphaResponse) {
      if (pending?.id !== response.id) {
        return
      }
      const {cancelled} = pending
      pending = undefined
      if (!cancelled) {
        if (response.kind === 'alpha') {
          capture?.onSample(response.sample)
        } else {
          capture?.onError(new Error(response.message))
        }
      }
    },
  }
}

const expectAcknowledgement = async (
  pending: Promise<GpuResponse>,
  kind: 'connected' | 'initialized' | 'textures-uploaded',
  error: string,
) => {
  const response = await pending
  if (response.kind !== kind) {
    if (response.kind === 'rendered') {
      response.bitmap?.close()
    }
    throw new Error(error)
  }
}
type RequestGpu = (command: GpuCommand, transfer: Transferable[]) => Promise<GpuResponse>
const createInitializationRequests = (
  request: RequestGpu,
): Pick<GpuClient, 'initialize' | 'uploadTextures'> => ({
  initialize: (command) =>
    expectAcknowledgement(
      request(command, command.surface === undefined ? [] : [command.surface]),
      'initialized',
      'Unexpected GPU initialization response',
    ),
  uploadTextures: (textures) =>
    expectAcknowledgement(
      request({kind: 'upload-textures', textures}, [...textures]),
      'textures-uploaded',
      'Unexpected GPU texture upload response',
    ),
})
const prepareDraw = (
  command: DrawGpu,
  geometry: GeometryToken | undefined,
  vertices: Float32Array | undefined,
  display: Float32Array | undefined,
): DrawGpu => {
  const positions =
    geometry === undefined ? reusableBuffer(vertices, command.vertices.length) : new Float32Array()
  const values = reusableBuffer(display, command.display.length)
  if (geometry === undefined) {
    positions.set(command.vertices)
  }
  values.set(command.display)
  return {
    display: values,
    height: command.height,
    kind: 'draw',
    ...(geometry === undefined ? {} : {geometry}),
    vertices: positions,
    view: command.view,
    width: command.width,
  }
}

/** Owns a GPU Worker and recycles transferred numerical storage after GPU submission. */
export const createGpuClient = (
  capture?: PlayerAlphaCapture,
  mode: 'bitmap' | 'direct' = 'bitmap',
): GpuClient => {
  const worker = new Worker(new URL('./gpu-worker.ts', import.meta.url), {type: 'module'})
  const pending = new Map<number, PendingRequest>()
  const owner = crypto.randomUUID()
  const completed = new WeakSet<GeometryToken>()
  let sequence = 0
  let disposed = false
  let failure: Error | undefined
  let vertices: Float32Array | undefined
  let display: Float32Array | undefined
  const alpha = createAlphaRequests(capture)
  const fail = (cause: Error) => {
    if (failure !== undefined || disposed) {
      return
    }
    failure = cause
    alpha.clear()
    connections.destroy()
    worker.terminate()
    for (const request of pending.values()) {
      request.reject(cause)
    }
    pending.clear()
  }
  worker.onerror = (event) => fail(new Error(event.message || 'GPU Worker failed'))
  worker.onmessageerror = () => fail(new Error('GPU Worker response cannot be decoded'))
  worker.onmessage = ({data}: MessageEvent<GpuResponse>) => {
    if (data.kind === 'alpha' || data.kind === 'alpha-error') {
      alpha.receive(data)
      return
    }
    const request = pending.get(data.id)
    if (request === undefined && data.kind === 'error' && !disposed) {
      fail(new Error(data.message))
      return
    }
    if (request === undefined || disposed) {
      if (data.kind === 'rendered') {
        data.bitmap?.close()
      }
      return
    }
    pending.delete(data.id)
    if (data.kind === 'error') {
      alpha.clear(data.id)
      request.reject(new Error(data.message))
      return
    }
    if (data.kind === 'rendered') {
      ;({display, vertices} = data)
    }
    request.resolve(data)
  }
  const request: RequestGpu = (command, transfer) =>
    new Promise<GpuResponse>((resolve, reject) => {
      const rejectUnsent = (error: Error) => {
        if (command.kind === 'upload-textures') {
          command.textures.forEach((image) => image.close())
        }
        reject(error)
      }
      if (disposed || failure !== undefined) {
        rejectUnsent(failure ?? new Error('GPU Worker disposed'))
        return
      }
      sequence += 1
      const id = sequence
      pending.set(id, {reject, resolve})
      if (command.kind === 'draw' && command.alpha !== undefined) {
        alpha.begin(id)
      }
      try {
        worker.postMessage({...command, id}, transfer)
      } catch (cause) {
        alpha.clear(id)
        pending.delete(id)
        rejectUnsent(cause instanceof Error ? cause : new Error(String(cause)))
      }
    })
  const connections = createGeometryConnections({
    connect: (connection, port) =>
      expectAcknowledgement(
        request({connection, kind: 'connect', owner, port}, [port]),
        'connected',
        'Unexpected geometry connection response',
      ),
    disconnect(connection) {
      if (!disposed && failure === undefined) {
        worker.postMessage({connection, id: 0, kind: 'disconnect-geometry'})
      }
    },
    owner,
  })
  const drawFrame = async (command: DrawGpu, size: FrameAlphaSize | undefined) => {
    const token = command.geometry
    if (token !== undefined && token.owner !== owner) {
      throw new Error('Geometry belongs to another rendering device')
    }
    const resident = token !== undefined && !completed.has(token)
    const draw = prepareDraw(command, resident ? token : undefined, vertices, display)
    vertices = undefined
    display = undefined
    const response = await request(size === undefined ? draw : {...draw, alpha: size}, [
      draw.vertices.buffer,
      draw.display.buffer,
    ])
    if (response.kind !== 'rendered') {
      throw new Error('Unexpected GPU frame response')
    }
    if (resident) {
      if (!matchesGeometry(response.geometry, token)) {
        response.bitmap?.close()
        throw new Error('Geometry response identity changed')
      }
      command.vertices.set(response.vertices)
      completed.add(token)
    }
    return response.bitmap
  }
  return {
    ...createInitializationRequests(request),
    cancelAlpha: alpha.cancel,
    connectGeometry: connections.connect,
    destroy() {
      if (!disposed) {
        disposed = true
        alpha.clear()
        connections.destroy()
        worker.terminate()
        for (const request of pending.values()) {
          request.reject(new Error('GPU Worker disposed'))
        }
        pending.clear()
        vertices = undefined
        display = undefined
      }
    },
    draw: (command) => drawFrame(command, alpha.claim()),
    prefetch: (command) =>
      mode === 'bitmap' && alpha.canPrefetch() ? drawFrame(command, undefined) : undefined,
    releaseGeometry(token) {
      if (!disposed && failure === undefined && token.owner === owner) {
        worker.postMessage({id: 0, kind: 'release-geometry', token})
      }
    },
  }
}
