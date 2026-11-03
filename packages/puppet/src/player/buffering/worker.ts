import {createBufferEngine} from './create-buffer-engine'
import type {BufferRequest, BufferResponse} from './types'

let engine: ReturnType<typeof createBufferEngine> | undefined
let generation = 0
const respond = (response: BufferResponse, transfer: Transferable[] = []) =>
  self.postMessage(response, {transfer})
self.addEventListener('message', (event: MessageEvent<BufferRequest>) => {
  const message = event.data
  try {
    switch (message.kind) {
      case 'initialize':
        engine = createBufferEngine(message.document)
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
          const frame = {
            deltaTime: request.deltaTime,
            generation,
            kind: 'frame' as const,
            time: request.time,
            ...engine.step(
              request.deltaTime,
              request.buffer,
              request.input,
              request.acknowledgedNotices,
            ),
          }
          respond({frame, id: message.id, kind: 'produced'}, [request.buffer])
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
})
