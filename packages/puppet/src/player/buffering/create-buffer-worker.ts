import type {PuppetSound} from '../audio/decode-wav'
import type {PuppetDocument} from '../document'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {BufferRequest, BufferWorker, PackedBufferResponse, ProduceBufferFrame} from './types'
import {createDecoder} from './render-frame/create-decoder'

interface PendingRequest {
  readonly reject: (cause: Error) => void
  readonly resolve: (response: PackedBufferResponse) => void
}

/** Creates one owned Worker; the caller must dispose it on replacement or player destruction. */
export const createBufferWorker = (onError: (cause: Error) => void): BufferWorker => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
  const pending = new Map<number, PendingRequest>()
  let sequence = 0
  let knownAudio = new Map<string, PuppetSound>()
  let decodeFrame = createDecoder()
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
    rejectPending(cause)
    onError(cause)
  }
  worker.onerror = (event) => fail(new Error(event.message || 'Playback Worker failed'))
  worker.onmessageerror = () => fail(new Error('Playback Worker response could not be decoded'))
  worker.onmessage = (event: MessageEvent<PackedBufferResponse>) => {
    const response = event.data
    const request = pending.get(response.id)
    if (request !== undefined) {
      pending.delete(response.id)
      if (response.kind === 'error') {
        request.reject(new Error(response.message))
      } else {
        request.resolve(response)
      }
    }
  }
  const request = (message: BufferRequest, transfer: Transferable[] = []) =>
    new Promise<PackedBufferResponse>((resolve, reject) => {
      pending.set(message.id, {reject, resolve})
      try {
        worker.postMessage(message, transfer)
      } catch (cause) {
        pending.delete(message.id)
        reject(cause)
      }
    })
  return {
    destroy() {
      worker.terminate()
      knownAudio.clear()
      decodeFrame = createDecoder()
      rejectPending(new Error('Playback Worker was disposed'))
    },
    async initialize(
      document: PuppetDocument,
      audio: ReadonlyMap<string, PuppetSound> = new Map(),
    ) {
      knownAudio = new Map(audio)
      decodeFrame = createDecoder()
      const numeric = {
        ...document,
        parts: document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
        textureAssets: undefined,
      }
      const response = await request({
        audio,
        document: numeric,
        id: nextSequence(),
        kind: 'initialize',
      })
      if (response.kind !== 'initialized') {
        throw new Error('Unexpected playback initialization response')
      }
      return response.bytes
    },
    async produce(input: ProduceBufferFrame) {
      const response = await request({id: nextSequence(), kind: 'produce', request: input}, [
        input.buffer,
      ])
      if (response.kind !== 'produced') {
        throw new Error('Unexpected playback frame response')
      }
      const {frame} = response
      return frame.kind === 'stale'
        ? frame
        : {
            ...frame,
            computed: {...frame.computed, frame: decodeFrame(frame.computed.frame)},
          }
    },
    async reset(state: PlayerRuntimeState, generation: number, inputRevision = 0) {
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
