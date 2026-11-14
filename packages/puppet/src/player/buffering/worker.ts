import {createBufferEngine} from './create-buffer-engine'
import type {BufferRequest, PackedBufferResponse} from './types'
import {loadWasmTransform} from '../internal/wasm/deformation/load-transform'
import {createEncoder} from './render-frame/create-encoder'

let engine: ReturnType<typeof createBufferEngine> | undefined
let generation = 0
let encodeFrame = createEncoder()
const respond = (response: PackedBufferResponse, transfer: Transferable[] = []) =>
  self.postMessage(response, {transfer})
const processMessage = async (message: BufferRequest) => {
  try {
    switch (message.kind) {
      case 'initialize':
        engine = createBufferEngine(message.document, await loadWasmTransform(message.document))
        encodeFrame = createEncoder()
        engine.updateAudio(message.audio)
        respond({bytes: engine.bytes, id: message.id, kind: 'initialized'})
        return
      case 'audio':
        if (engine === undefined) {
          throw new Error('A playback Worker must be initialized')
        }
        engine.patchAudio(message.sounds, message.removed)
        respond({id: message.id, kind: 'audio'})
        return
      case 'reset':
        if (engine === undefined) {
          throw new Error('A playback Worker must be initialized')
        }
        generation = message.generation
        engine.reset(message.state, message.inputRevision)
        respond({id: message.id, kind: 'reset'})
        return
      case 'produce': {
        const {request} = message
        if (engine === undefined) {
          throw new Error('A playback Worker must be initialized')
        }
        if (request.generation === generation) {
          const computed = engine.step(
            request.deltaTime,
            request.buffer,
            request.input,
            request.acknowledgedNotices,
          )
          const packed = encodeFrame(computed.computed.frame)
          const frame = {
            deltaTime: request.deltaTime,
            generation,
            kind: 'frame' as const,
            time: request.time,
            ...computed,
            computed: {...computed.computed, frame: packed},
          }
          respond({frame, id: message.id, kind: 'produced'}, [
            request.buffer,
            packed.parts.buffer,
            packed.layers.buffer,
          ])
        } else {
          respond(
            {
              frame: {buffer: request.buffer, generation: request.generation, kind: 'stale'},
              id: message.id,
              kind: 'produced',
            },
            [request.buffer],
          )
        }
        return
      }
      default: {
        const exhaustive: never = message
        throw new Error(`Unknown playback Worker message: ${exhaustive}`)
      }
    }
  } catch (cause) {
    respond({
      id: message.id,
      kind: 'error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  }
}

// Preserve the Worker message order while the numeric module loads asynchronously.
let pending = Promise.resolve()
self.addEventListener('message', (event: MessageEvent<BufferRequest>) => {
  pending = pending.then(() => processMessage(event.data))
})
