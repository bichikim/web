import type {PuppetSound} from '../audio/decode-wav'
import {getMotionSoundMouth} from '../audio/motion-sound-mouth'
import {noop} from 'es-toolkit'
import type {BufferedInput} from './types'
import type {PuppetDocument} from '../document'
import {createPlayerRuntime} from '../create-player-runtime'
import type {PlayerRuntimeState} from '../player-runtime-types'
import {markPreparedPuppetDocument} from '../internal/prepared-document'
import {computeRenderFrame} from '../internal/compute-render-frame'
import {createNativeDeformation} from '../internal/create-native-deformation'
import type {RendererController} from '../rendering/create-renderer-controller'

/** Owns numeric geometry and simulation only; textures and GPU resources remain with the host. */
export const createBufferEngine = (document: PuppetDocument) => {
  const storage = new Float32Array(
    document.parts.reduce((total, part) => total + part.mesh.vertices.length, 0),
  )
  let offset = 0
  const vertices = new Map(
    document.parts.map((part) => {
      const buffer = storage.subarray(offset, offset + part.mesh.vertices.length)
      offset += buffer.length
      return [part.id, buffer] as const
    }),
  )
  const native = createNativeDeformation(document)
  let evaluation: Parameters<RendererController['applyFrame']> | undefined
  let inputRevision = 0
  const renderer: RendererController = {
    applyFrame(mix, parameterValues, poseOpacityByPartId, overrides) {
      evaluation = [mix, parameterValues, poseOpacityByPartId, overrides]
    },
    applyPreparedFrame() {
      throw new Error('A compute engine evaluates its own geometry')
    },
    configure: async () => {
      throw new Error('A compute renderer cannot own a GPU canvas')
    },
    destroy: noop,
    getPaintOrder: () => [],
    getPartVertices: (partId) => vertices.get(partId),
    getRenderingInfo: () => ({antialiasing: 'ssaa', renderer: 'webgl'}),
    redraw: noop,
    resize: noop,
    setRunning: noop,
    setViewCamera: noop,
    subscribeFrame: noop,
    toDocumentPoint: (point) => point,
    updateDocument: () => false,
  }
  let audio: ReadonlyMap<string, PuppetSound> = new Map()
  const runtime = createPlayerRuntime({
    compute: true,
    document: markPreparedPuppetDocument(document),
    randomSeed: 1,
    renderer,
    sounds: {
      load: noop,
      mouth: (frames, deltaTime) => getMotionSoundMouth(frames, (src) => audio.get(src), deltaTime),
      snapshot: () => audio,
      stop: noop,
      sync: noop,
    },
  })
  return {
    bytes: storage.byteLength,
    patchAudio(sounds: ReadonlyMap<string, PuppetSound>, removed: ReadonlyArray<string>) {
      const updated = new Map(audio)
      removed.forEach((src) => updated.delete(src))
      sounds.forEach((sound, src) => updated.set(src, sound))
      audio = updated
    },
    reset(state: PlayerRuntimeState, revision = 0) {
      inputRevision = revision
      runtime.restore(state)
    },
    step(deltaTime: number, buffer: ArrayBuffer, input?: BufferedInput, acknowledgedNotices = 0) {
      if (input !== undefined) {
        runtime.restore(input.state)
        inputRevision = input.revision
        if (input.settle) {
          runtime.player.resetPhysics()
        }
      }
      runtime.acknowledgeNotices(acknowledgedNotices)
      runtime.tick(deltaTime)
      if (evaluation === undefined) {
        throw new Error('A computed frame was not initialized')
      }
      const [mix, parameterValues, poseOpacityByPartId, overrides] = evaluation
      const frame = computeRenderFrame({
        document,
        mix,
        native,
        overrides,
        parameterValues,
        poseOpacityByPartId,
        verticesByPartId: vertices,
      })
      const output = new Float32Array(buffer)
      output.set(storage)
      return {
        computed: {frame, parameterValues, vertices: output},
        inputRevision,
        playback: runtime.frame(),
        state: runtime.capture(),
      }
    },
    updateAudio(sounds: ReadonlyMap<string, PuppetSound>) {
      audio = sounds
    },
  }
}
