import {
  createPlayer,
  type Player,
  preparePuppetDocument,
  type PuppetDocument,
} from '@winter-love/puppet/player'
import {encodeFramePng, type FramePixels} from '../encode-frame-png'
import {readCanvasFrame} from './read-canvas-frame'

export interface RenderDocumentOptions {
  /** Immutable captured model, independent of the interactive player's pose. */
  readonly document: PuppetDocument
  /** Largest output dimension; omitted, use 1024 pixels. */
  readonly size?: number
  /** Optional motion evaluated at the requested time. */
  readonly motionId?: string
  /** Motion position in seconds; omitted, use zero. */
  readonly time?: number
  /** Optional parameter overrides for pose verification. */
  readonly parameters?: Readonly<Record<string, number>>
}

/** Captures a completed GPU draw in a separate player and releases all of its resources. */
export const renderDocument = async (options: RenderDocumentOptions) => {
  const prepared = await preparePuppetDocument({document: options.document})
  if (!prepared.ok) {
    throw new Error('Render document could not be prepared')
  }
  const canvas = document.createElement('canvas')
  const DEFAULT_SIZE = 1024
  const size = options.size ?? DEFAULT_SIZE
  const resolution =
    size / Math.max(prepared.document.viewport.width, prepared.document.viewport.height)
  let armed = false
  let frame: FramePixels | undefined
  let player: Player | undefined
  try {
    player = await createPlayer({
      buffering: false,
      canvas,
      document: prepared.document,
      framing: 'viewport',
      motionId: options.motionId,
      onAfterRender: () => {
        if (armed) {
          frame = readCanvasFrame(canvas)
        }
      },
      parameterValues: options.parameters,
      physicsPreview: false,
      randomSeed: 1,
      renderer: 'webgl',
      resolution,
    })
    player.pause()
    player.seek(options.time ?? 0)
    armed = true
    player.redraw()
    if (frame === undefined) {
      throw new Error('Renderer did not complete the requested frame')
    }
    // Native canvas encoding unpremultiplies the same RGBA bytes differently across OSes.
    const bytes = encodeFramePng(frame)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error('Could not encode the frame'))
      reader.readAsDataURL(new Blob([new Uint8Array(bytes)], {type: 'image/png'}))
    })
    return {dataUrl, height: canvas.height, width: canvas.width}
  } finally {
    player?.destroy()
    canvas.remove()
  }
}
