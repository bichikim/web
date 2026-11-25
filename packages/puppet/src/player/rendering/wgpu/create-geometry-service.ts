import {type CanvasRenderer, GeometryFinisher} from './wasm/runtime'
import {
  GEOMETRY_COMMAND_STRIDE,
  type GeometryRequest,
  type GeometryResponse,
  type GeometryToken,
  type PrepareGeometry,
} from '../../geometry/types'
import type {GpuQueue} from './create-queue'
import type {FrameAlphaSize} from '../../rendering-options'
interface Entry {
  readonly ready: Promise<number>
  readonly resolve: (id: number) => void
  readonly reject: (cause: Error) => void
  cancelled: boolean
  started: boolean
  native: number | undefined
  released: boolean
}
interface Connection {
  readonly owner: string
  readonly port: MessagePort
  readonly entries: Map<number, Entry>
  readonly cancelled: Set<number>
  seen: number
  closed: boolean
  finisher: GeometryFinisher | undefined
}
interface GeometryServiceOptions {
  /** Borrows the renderer initialized by the Worker. */
  readonly renderer: () =>
    | Pick<
        CanvasRenderer,
        | 'enable_geometry'
        | 'prepare_geometry'
        | 'draw_geometry'
        | 'release_geometry'
        | 'request_alpha'
      >
    | undefined
  /** Serializes all borrows of that renderer. */
  readonly run: GpuQueue
  /** Reports loss of a port to the rendering owner. */
  readonly onError: (cause: Error) => void
}
const entry = (connection: Connection, frame: number) => {
  let current = connection.entries.get(frame)
  if (current === undefined) {
    let resolve!: (id: number) => void
    let reject!: (cause: Error) => void
    const ready = new Promise<number>((yes, no) => {
      resolve = yes
      reject = no
    })
    ready.catch(() => undefined)
    current = {
      cancelled: false,
      native: undefined,
      ready,
      reject,
      released: false,
      resolve,
      started: false,
    }
    connection.entries.set(frame, current)
  }
  return current
}
const respond = (
  connection: Connection,
  response: GeometryResponse,
  transfer: Transferable[] = [],
) => {
  if (!connection.closed) {
    connection.port.postMessage(response, transfer)
  }
}
/** Maps packed coordinates back to the full vertex buffer in command order. */
export const getGeometryCacheRanges = (commands: Uint32Array) => {
  const count = commands.length / GEOMETRY_COMMAND_STRIDE
  const ranges = new Uint32Array(count * 2)
  for (let index = 0; index < count; index += 1) {
    const command = index * GEOMETRY_COMMAND_STRIDE
    ranges[index * 2] = commands[command]! * 2
    ranges[index * 2 + 1] = commands[command + 1]! * 2
  }
  return ranges
}
const respondPrepared = (
  connection: Connection,
  message: PrepareGeometry,
  vertices: Float32Array,
) => {
  if (vertices.length === message.vertices.length) {
    respond(connection, {id: message.id, kind: 'prepared', vertices}, [vertices.buffer])
    return
  }
  const ranges = getGeometryCacheRanges(message.commands)
  respond(connection, {id: message.id, kind: 'prepared', ranges, vertices}, [
    vertices.buffer,
    ranges.buffer,
  ])
}
const cancelPreparation = (connection: Connection, message: PrepareGeometry) => {
  connection.entries.delete(message.frame)
  respond(connection, {id: message.id, kind: 'cancelled'})
}
const requireConnection = (connections: ReadonlyMap<number, Connection>, token: GeometryToken) => {
  const connection = connections.get(token.connection)
  if (connection === undefined || connection.owner !== token.owner) {
    throw new Error('Geometry belongs to another rendering device')
  }
  return connection
}
const requireRenderer = (options: GeometryServiceOptions) => {
  const current = options.renderer()
  if (current === undefined) {
    throw new Error('GPU renderer is not initialized')
  }
  return current
}
const requireFinisher = ({finisher}: Connection) => {
  if (finisher === undefined) {
    throw new Error('Geometry layout is not initialized')
  }
  return finisher
}
const drawGeometry = (
  renderer: ReturnType<typeof requireRenderer>,
  id: number,
  display: Float32Array,
  alpha?: FrameAlphaSize,
) => {
  if (alpha !== undefined) {
    renderer.request_alpha(alpha.width, alpha.height)
  }
  return renderer.draw_geometry(id, display)
}
/** Keeps completion and rasterization on one device, with bounded per-frame ownership. */
export const createGeometryService = (options: GeometryServiceOptions) => {
  const connections = new Map<number, Connection>()
  let sequence = 0
  const renderer = () => requireRenderer(options)
  const releaseNative = (current: Entry) => {
    if (current.native !== undefined && !current.released) {
      current.released = true
      const id = current.native
      options.run(() => renderer().release_geometry(id)).catch(() => undefined)
    }
  }
  const disconnect = (id: number) => {
    const connection = connections.get(id)
    if (connection === undefined) {
      return
    }
    connections.delete(id)
    connection.closed = true
    connection.port.close()
    connection.entries.forEach((current) => {
      current.cancelled = true
      current.reject(new Error('Geometry connection closed'))
      releaseNative(current)
    })
    connection.entries.clear()
    connection.cancelled.clear()
    options.run(() => connection.finisher?.free()).catch(() => undefined)
  }
  const prepare = async (connection: Connection, message: PrepareGeometry) => {
    const finisher = requireFinisher(connection)
    const current = entry(connection, message.frame)
    if (current.started) {
      throw new Error('Duplicate geometry frame')
    }
    current.started = true
    connection.seen = Math.max(connection.seen, message.frame)
    if (connection.cancelled.delete(message.frame) || current.cancelled) {
      current.reject(new Error('Geometry frame released'))
      cancelPreparation(connection, message)
      return
    }
    sequence += 1
    const nativeId = sequence
    current.native = nativeId
    const isCancelled = () => connection.closed || current.cancelled
    try {
      const vertices = await options.run(() =>
        isCancelled()
          ? undefined
          : renderer().prepare_geometry(
              nativeId,
              message.vertices,
              message.commands,
              message.values,
              message.plan,
              finisher,
              isCancelled,
            ),
      )
      if (vertices === undefined || isCancelled()) {
        releaseNative(current)
        cancelPreparation(connection, message)
        return
      }
      current.resolve(nativeId)
      respondPrepared(connection, message, vertices)
    } catch (cause) {
      current.reject(cause instanceof Error ? cause : new Error(String(cause)))
      throw cause
    }
  }
  return {
    connect(owner: string, id: number, port: MessagePort) {
      disconnect(id)
      const connection: Connection = {
        cancelled: new Set(),
        closed: false,
        entries: new Map(),
        finisher: undefined,
        owner,
        port,
        seen: 0,
      }
      connections.set(id, connection)
      port.onmessage = ({data}: MessageEvent<GeometryRequest>) => {
        const task =
          data.kind === 'initialize'
            ? options.run(async () => {
                await renderer().enable_geometry()
                connection.finisher?.free()
                connection.finisher = new GeometryFinisher(data.layout)
                respond(connection, {id: data.id, kind: 'initialized'})
              })
            : prepare(connection, data)
        task.catch((cause) =>
          respond(connection, {
            id: data.id,
            kind: 'error',
            message: cause instanceof Error ? cause.message : String(cause),
          }),
        )
      }
      port.onmessageerror = () => {
        disconnect(id)
        options.onError(new Error('Geometry port message cannot be decoded'))
      }
      port.start()
    },
    destroy() {
      connections.forEach((_, id) => disconnect(id))
    },
    disconnect,
    async draw(token: GeometryToken, display: Float32Array, alpha?: FrameAlphaSize) {
      const connection = requireConnection(connections, token)
      if (
        connection.cancelled.has(token.frame) ||
        (!connection.entries.has(token.frame) && token.frame <= connection.seen)
      ) {
        throw new Error('Geometry frame released')
      }
      const current = entry(connection, token.frame)
      const id = await current.ready
      return options.run(() => {
        if (current.cancelled) {
          throw new Error('Geometry frame released')
        }
        return drawGeometry(renderer(), id, display, alpha)
      })
    },
    release(token: GeometryToken) {
      const connection = connections.get(token.connection)
      if (connection === undefined || connection.owner !== token.owner) {
        return
      }
      const current = connection.entries.get(token.frame)
      if (current !== undefined) {
        current.cancelled = true
        if (!current.started) {
          connection.cancelled.add(token.frame)
        }
        current.reject(new Error('Geometry frame released'))
        releaseNative(current)
        connection.entries.delete(token.frame)
      } else if (token.frame > connection.seen) {
        connection.cancelled.add(token.frame)
      }
    },
  }
}
