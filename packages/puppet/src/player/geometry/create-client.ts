import type {
  GeometryCompletion,
  GeometryEndpoint,
  GeometryPreparation,
  GeometryRequest,
  GeometryResponse,
} from './types'
interface Pending {
  readonly resolve: (response: GeometryResponse) => void
  readonly reject: (cause: Error) => void
}
export interface GeometryClient {
  readonly initialize: (layout: Float64Array) => Promise<void>
  readonly prepare: (input: GeometryPreparation) => Promise<GeometryCompletion>
  readonly free: () => void
}
/** Owns the transferred port; preparation borrows source vertices and transfers the other packets. */
export const createGeometryClient = (endpoint: GeometryEndpoint): GeometryClient => {
  const {port} = endpoint
  const pending = new Map<number, Pending>()
  let sequence = 0
  let closed = false
  const fail = (cause: Error) => {
    if (!closed) {
      closed = true
      port.close()
      pending.forEach((request) => request.reject(cause))
      pending.clear()
    }
  }
  port.onmessage = ({data}: MessageEvent<GeometryResponse>) => {
    const waiter = pending.get(data.id)
    if (waiter !== undefined) {
      pending.delete(data.id)
      if (data.kind === 'error') {
        waiter.reject(new Error(data.message))
      } else {
        waiter.resolve(data)
      }
    }
  }
  port.onmessageerror = () => fail(new Error('Geometry port response cannot be decoded'))
  port.start()
  const request = (message: GeometryRequest, transfer: Transferable[]) =>
    new Promise<GeometryResponse>((resolve, reject) => {
      if (closed) {
        reject(new Error('Geometry port closed'))
        return
      }
      pending.set(message.id, {reject, resolve})
      try {
        port.postMessage(message, transfer)
      } catch (cause) {
        pending.delete(message.id)
        reject(cause)
      }
    })
  return {
    free: () => fail(new Error('Geometry port closed')),
    async initialize(layout) {
      sequence += 1
      const response = await request({id: sequence, kind: 'initialize', layout}, [layout.buffer])
      if (response.kind !== 'initialized') {
        throw new Error('Unexpected geometry initialization response')
      }
    },
    async prepare({frame, vertices, commands, values, plan}) {
      const source = vertices.slice()
      sequence += 1
      const response = await request(
        {commands, frame, id: sequence, kind: 'prepare', plan, values, vertices: source},
        [source.buffer, commands.buffer, values.buffer, plan.buffer],
      )
      if (response.kind !== 'prepared' && response.kind !== 'cancelled') {
        throw new Error('Unexpected geometry preparation response')
      }
      return response
    },
  }
}
