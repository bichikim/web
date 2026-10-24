import {createPlayer, type Player, type PlayerFrame} from '../player'
import type {PreparedPuppetDocument} from '../player/internal/prepared-document'
import type {PuppetParameterValueMap} from '../deformation'
import {getEditorAudioDestination} from './internal/editor-audio'
import {EDITOR_VIEWPORT_PADDING} from './internal/viewport'

const MAXIMUM_RENDER_DIMENSION = 4096

interface CanvasPlayerOptions {
  /** Canvas owned and released by the caller. */
  readonly canvas: HTMLCanvasElement
  /** Container observed by the caller for resizes. */
  readonly host: HTMLDivElement
  /** Parsed editor document. */
  readonly document: PreparedPuppetDocument
  /** Initial motion. Omitted, use the document's default motion. */
  readonly motionId?: string
  /** Initial parameter overrides. Omitted, use the document defaults. */
  readonly parameterValues?: PuppetParameterValueMap
  /** Whether to simulate physics. Omitted, enable physics. */
  readonly physicsPreview?: boolean
  /** Reports frames to the active screen. */
  readonly onFrame: (frame: PlayerFrame) => void
  /** Prepares a shared spatial overlay before each render. */
  readonly onBeforeRender: () => void
  /** Composites a shared spatial overlay after each render. */
  readonly onAfterRender: () => void
}
/** Creates a renderer with the same document-space framing as the editing overlays. */
export const createCanvasPlayer = (options: CanvasPlayerOptions): Promise<Player> =>
  createPlayer({
    canvas: options.canvas,
    document: options.document,
    framing: 'viewport',
    motionId: options.motionId,
    onAfterRender: options.onAfterRender,
    onBeforeRender: options.onBeforeRender,
    onFrame: options.onFrame,
    parameterValues: options.parameterValues,
    physicsPreview: options.physicsPreview,
    resizeTo: options.host,
    resolution: Math.min(
      window.devicePixelRatio,
      2,
      MAXIMUM_RENDER_DIMENSION /
        (Math.max(options.document.viewport.width, options.document.viewport.height) *
          (1 + 2 * EDITOR_VIEWPORT_PADDING)),
    ),
    soundDestination: getEditorAudioDestination(),
    viewportPadding: EDITOR_VIEWPORT_PADDING,
  })
