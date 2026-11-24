import {loadWasmWorker} from '../internal/wasm/load-worker'
import {createGeometryClient, type GeometryClient} from '../geometry/create-client'
import {GEOMETRY_COMMAND_STRIDE, type GeometryEndpoint} from '../geometry/types'
import {
  type InitializeBufferRequest,
  type InitializeRuntimeSectionRequest,
  type PackedBufferResponse,
  PLAYER_BUFFER_FRAMES,
  type RustBufferRequest,
} from './types'
let runtime: Awaited<ReturnType<typeof loadWasmWorker>> | undefined
let geometry: GeometryClient | undefined
let endpoint: GeometryEndpoint | undefined
const running = new Set<Promise<void>>()
const respond = (response: PackedBufferResponse, transfer: Transferable[] = []) =>
  self.postMessage(response, {transfer})
const reject = (id: number, cause: unknown) =>
  respond({id, kind: 'error', message: cause instanceof Error ? cause.message : String(cause)})
const deliver = (response: PackedBufferResponse) => {
  if (response.kind !== 'produced') {
    respond(response)
    return
  }
  const {frame} = response
  if (frame.kind === 'stale') {
    respond({...response, frame}, [frame.buffer])
    return
  }
  const {vertices, frame: packed} = frame.computed
  respond(response, [vertices.buffer, packed.parts.buffer, packed.layers.buffer])
}
const initialize = async (message: InitializeBufferRequest | InitializeRuntimeSectionRequest) => {
  await Promise.all(running)
  geometry?.free()
  runtime?.destroy()
  const partCount =
    message.kind === 'initialize' ? message.document.parts.length : message.partCount
  const [loaded, section] = await Promise.all([
    loadWasmWorker(partCount),
    message.kind === 'initialize-section' ? message.runtimeSection.arrayBuffer() : undefined,
  ])
  runtime = loaded
  endpoint = message.geometry
  geometry = endpoint === undefined ? undefined : createGeometryClient(endpoint)
  const {geometry: _geometry, ...content} = message
  const initializeRuntime = (deferGeometry?: boolean) => {
    if (content.kind === 'initialize') {
      return loaded.processPacked(
        deferGeometry === undefined ? content : {...content, deferGeometry},
      )
    }
    if (section === undefined || loaded.initializeSection === undefined) {
      throw new Error('Playback module has no binary initialization capability')
    }
    return loaded.initializeSection(content.id, section, deferGeometry === true)
  }
  let response = initializeRuntime(geometry === undefined ? undefined : true)
  if (response.kind === 'initialized') {
    let reason: string | undefined
    if (geometry !== undefined) {
      try {
        if (runtime.geometry === undefined) {
          throw new Error('Playback module has no geometry capability')
        }
        await geometry.initialize(runtime.geometry.layout())
      } catch (cause) {
        reason = cause instanceof Error ? cause.message : String(cause)
        geometry.free()
        geometry = undefined
        endpoint = undefined
        response = initializeRuntime(false)
      }
    }
    if (response.kind === 'initialized') {
      response = {
        ...response,
        geometry:
          geometry === undefined
            ? {runtime: 'cpu', ...(reason === undefined ? {} : {reason})}
            : {pipeline: 'shared', runtime: 'gpu'},
        threads: runtime.threads ?? 1,
      }
    }
  }
  deliver(response)
}
const processMessage = async (message: RustBufferRequest) => {
  try {
    if (message.kind === 'initialize' || message.kind === 'initialize-section') {
      await initialize(message)
      return
    }
    if (runtime === undefined) {
      throw new Error('A Rust playback Worker must be initialized')
    }
    if (message.kind === 'produce' && running.size >= PLAYER_BUFFER_FRAMES) {
      await Promise.race(running)
    }
    const response = runtime.processPacked(message)
    if (response.kind !== 'produced' || response.frame.kind === 'stale') {
      deliver(response)
      return
    }
    const {frame} = response
    const capability = geometry === undefined ? undefined : runtime.geometry
    const batch = capability?.take()
    if (
      geometry === undefined ||
      endpoint === undefined ||
      capability === undefined ||
      batch === undefined
    ) {
      deliver(response)
      return
    }
    const token = {connection: endpoint.connection, frame: batch.id, owner: endpoint.owner}
    const vertices = batch.commands.reduce(
      (sum, value, index) => sum + (index % GEOMETRY_COMMAND_STRIDE === 1 ? value : 0),
      0,
    )
    const completion = geometry
      .prepare({...batch, frame: batch.id, vertices: frame.computed.vertices})
      .then(
        (result) =>
          result.kind === 'prepared'
            ? capability.cache(batch.id, result.vertices, result.ranges)
            : capability.cache(batch.id, undefined),
        () => capability.cache(batch.id, undefined),
      )
      .catch((cause) => reject(message.id, cause))
    running.add(completion)
    completion.finally(() => running.delete(completion))
    deliver({
      ...response,
      frame: {...frame, computed: {...frame.computed, geometry: token}},
      geometry: {pipeline: 'shared', runtime: 'gpu', vertices},
    })
  } catch (cause) {
    reject(message.id, cause)
  }
}
// Stateful simulation stays ordered. GPU completion never gates delivery of its render ticket.
let pending = Promise.resolve()
self.addEventListener('message', (event: MessageEvent<RustBufferRequest>) => {
  pending = pending.then(() => processMessage(event.data))
})
