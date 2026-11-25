import type {NativePlayerSurface} from '../native-backend'
import type {GeometryConnection} from '../geometry/types'
import type {PuppetSound} from '../audio/decode-wav'
import type {PuppetDocument} from '../document'
import type {PlayerRuntimeState} from '../player-runtime-types'
import {preparedRuntimeSection} from '../internal/prepared-document'
import type {
  BufferedInput,
  BufferWorker,
  CompactWorkerInput,
  PackedBufferResponse,
  PlayerWorkerRuntime,
  ProduceBufferFrame,
  RustBufferRequest,
} from './types'
import {createDecoder} from './render-frame/create-decoder'

interface PendingRequest {
  readonly reject: (cause: Error) => void
  readonly resolve: (response: PackedBufferResponse) => void
}

interface WorkerCheckpoint {
  readonly id: number
  readonly state: PlayerRuntimeState
}

const prepareInput = (
  input: BufferedInput | undefined,
  checkpoint: WorkerCheckpoint | undefined,
): BufferedInput | CompactWorkerInput | undefined => {
  if (input === undefined) {
    return undefined
  }
  const {adjustmentBase, ...full} = input
  if (checkpoint !== undefined && adjustmentBase === checkpoint.state) {
    return {
      adjustments: input.state.adjustments,
      checkpointId: checkpoint.id,
      revision: input.revision,
      settle: input.settle,
    }
  }
  return full
}

const numericalDocument = (document: PuppetDocument) => ({
  ...document,
  parts: document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
  textureAssets: undefined,
})

interface InitializationRequestOptions {
  readonly audio: ReadonlyMap<string, PuppetSound>
  readonly document: PuppetDocument
  readonly geometry: GeometryConnection | undefined
  readonly id: number
  readonly runtimeSection: Blob | undefined
}

const createInitializationRequest = (options: InitializationRequestOptions): RustBufferRequest => {
  const {audio, document, geometry, id, runtimeSection} = options
  const connection =
    geometry === undefined
      ? {}
      : {geometry: {connection: geometry.connection, owner: geometry.owner, port: geometry.port}}
  if (runtimeSection === undefined) {
    return {audio, document: numericalDocument(document), id, kind: 'initialize', ...connection}
  }
  return {
    id,
    kind: 'initialize-section',
    partCount: document.parts.length,
    runtimeSection,
    ...connection,
  }
}

const initializeWithSection = async (
  section: Blob | undefined,
  initialize: (section?: Blob) => Promise<PackedBufferResponse>,
  canRetry: () => boolean,
) => {
  try {
    return await initialize(section)
  } catch (cause) {
    if (section === undefined || !canRetry()) {
      throw cause
    }
    return initialize()
  }
}

const receiveResponse = (
  pending: Map<number, PendingRequest>,
  response: PackedBufferResponse,
  fail: (cause: Error) => void,
) => {
  const request = pending.get(response.id)
  if (request === undefined) {
    if (response.kind === 'error') {
      fail(new Error(response.message))
    }
    return
  }
  pending.delete(response.id)
  if (response.kind === 'error') {
    request.reject(new Error(response.message))
  } else {
    request.resolve(response)
  }
}

/** Creates one owned Worker; the caller must dispose it on replacement or player destruction. */
// eslint-disable-next-line max-lines-per-function -- Request generations and retained checkpoints share the Worker lifetime.
export const createBufferWorker = (
  onError: (cause: Error) => void,
  runtime: PlayerWorkerRuntime = 'javascript',
  connectGeometry?: () => Promise<GeometryConnection | undefined>,
  nativePlayback?: NativePlayerSurface['playback'],
): BufferWorker => {
  const worker =
    nativePlayback === undefined
      ? runtime === 'rust'
        ? new Worker(new URL('./rust-worker.ts', import.meta.url), {type: 'module'})
        : new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
      : undefined
  const pending = new Map<number, PendingRequest>()
  let sequence = 0
  let checkpoint: WorkerCheckpoint | undefined
  let knownAudio = new Map<string, PuppetSound>()
  let decodeFrame = createDecoder('transferred')
  let failure: Error | undefined
  let disposed = false
  let geometry: GeometryConnection | undefined
  const nextSequence = () => {
    sequence += 1
    return sequence
  }
  const rejectPending = (cause: Error) => {
    for (const request of pending.values()) {
      request.reject(cause)
    }
    pending.clear()
  }
  const fail = (cause: Error) => {
    failure = cause
    rejectPending(cause)
    onError(cause)
  }
  if (worker !== undefined) {
    worker.onerror = (event) => fail(new Error(event.message || 'Playback Worker failed'))
    worker.onmessageerror = () => fail(new Error('Playback Worker response could not be decoded'))
    worker.onmessage = (event: MessageEvent<PackedBufferResponse>) => {
      receiveResponse(pending, event.data, fail)
    }
  }
  const request = (message: RustBufferRequest, transfer: Transferable[] = []) =>
    worker === undefined
      ? nativePlayback!(message)
      : new Promise<PackedBufferResponse>((resolve, reject) => {
          if (disposed || failure !== undefined) {
            reject(failure ?? new Error('Playback Worker disposed'))
            return
          }
          pending.set(message.id, {reject, resolve})
          try {
            worker.postMessage(message, transfer)
          } catch (cause) {
            pending.delete(message.id)
            reject(cause)
          }
        })
  const initialize = async (
    document: PuppetDocument,
    audio: ReadonlyMap<string, PuppetSound>,
    runtimeSection?: Blob,
  ) => {
    geometry?.release()
    const next =
      nativePlayback === undefined && runtime === 'rust' && connectGeometry !== undefined
        ? await connectGeometry()
        : undefined
    if (disposed) {
      next?.release()
      throw new Error('Playback Worker disposed')
    }
    geometry = next
    return request(
      createInitializationRequest({
        audio,
        document,
        geometry: next,
        id: nextSequence(),
        runtimeSection,
      }),
      next === undefined ? [] : [next.port],
    )
  }
  return {
    concurrency: () => 1,
    destroy() {
      if (disposed) {
        return
      }
      disposed = true
      checkpoint = undefined
      worker?.terminate()
      geometry?.release()
      geometry = undefined
      knownAudio.clear()
      decodeFrame = createDecoder('transferred')
      rejectPending(new Error('Playback Worker was disposed'))
    },
    async initialize(
      document: PuppetDocument,
      audio: ReadonlyMap<string, PuppetSound> = new Map(),
    ) {
      knownAudio = new Map(audio)
      checkpoint = undefined
      decodeFrame = createDecoder('transferred')
      const section =
        runtime === 'rust' && audio.size === 0 ? preparedRuntimeSection(document) : undefined
      const response = await initializeWithSection(
        section,
        (runtimeSection) => initialize(document, audio, runtimeSection),
        () => !disposed && failure === undefined,
      )
      if (response.kind !== 'initialized') {
        throw new Error('Unexpected playback initialization response')
      }
      return response.bytes
    },
    async produce(input: ProduceBufferFrame) {
      const id = nextSequence()
      const controls = prepareInput(input.input, checkpoint)
      checkpoint = undefined
      const response = await request({id, kind: 'produce', request: {...input, input: controls}}, [
        input.buffer,
      ])
      if (response.kind !== 'produced') {
        throw new Error('Unexpected playback frame response')
      }
      const {frame} = response
      if (runtime === 'rust' && id === sequence && frame.kind === 'frame') {
        checkpoint = {id, state: frame.state}
      }
      return frame.kind === 'stale'
        ? frame
        : {
            ...frame,
            computed: {...frame.computed, frame: decodeFrame(frame.computed.frame)},
          }
    },
    async reset(state: PlayerRuntimeState, generation: number, inputRevision = 0) {
      checkpoint = undefined
      const response = await request({
        generation,
        id: nextSequence(),
        inputRevision,
        kind: 'reset',
        state,
      })
      if (response.kind !== 'reset') {
        throw new Error('Unexpected playback reset response')
      }
    },
    async updateAudio(sounds: ReadonlyMap<string, PuppetSound>) {
      const added = new Map([...sounds].filter(([src, sound]) => knownAudio.get(src) !== sound))
      const removed = [...knownAudio.keys()].filter((src) => !sounds.has(src))
      if (added.size === 0 && removed.length === 0) {
        return
      }
      knownAudio = new Map(sounds)
      const response = await request({id: nextSequence(), kind: 'audio', removed, sounds: added})
      if (response.kind !== 'audio') {
        throw new Error('Unexpected playback audio response')
      }
    },
  }
}
