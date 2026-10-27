import {createPlayer, type Player, type PlayerFrame, type PlayerRenderingOptions} from '../player'
import type {PreparedPuppetDocument} from '../player/internal/prepared-document'
import type {PuppetParameterValueMap} from '../deformation'
import {getEditorAudioDestination} from './internal/editor-audio'
import {EDITOR_VIEWPORT_PADDING} from './internal/viewport'

const MAXIMUM_RENDER_DIMENSION = 4096
// Multiple filter passes soften a one-pixel surface. Keep two samples per displayed CSS pixel.
const RENDER_PIXELS_PER_CSS_PIXEL = 2

interface CanvasResolutionOptions {
  readonly viewport: PreparedPuppetDocument['viewport']
  readonly renderScale: number
}

/** Follows displayed scale while retaining filter detail and the existing backing-buffer limit. */
export const getCanvasPlayerResolution = (options: CanvasResolutionOptions): number =>
  Math.min(
    RENDER_PIXELS_PER_CSS_PIXEL * options.renderScale,
    MAXIMUM_RENDER_DIMENSION /
      (Math.max(options.viewport.width, options.viewport.height) *
        (1 + 2 * EDITOR_VIEWPORT_PADDING)),
  )

interface CanvasPlayerOptions extends PlayerRenderingOptions {
  /** Whether a shared overlay currently draws into this canvas. Omitted, callbacks remain active. */
  readonly externalRendering?: () => boolean
  /** Canvas owned and released by the caller. */
  readonly canvas: HTMLCanvasElement
  /** Container observed by the caller for resizes. */
  readonly host: HTMLDivElement
  /** Parsed editor document. */
  readonly document: PreparedPuppetDocument
  readonly resolution: number
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
    antialiasing: options.antialiasing,
    canvas: options.canvas,
    document: options.document,
    externalRendering: options.externalRendering,
    framing: 'viewport',
    motionId: options.motionId,
    onAfterRender: options.onAfterRender,
    onBeforeRender: options.onBeforeRender,
    onFrame: options.onFrame,
    parameterValues: options.parameterValues,
    physicsPreview: options.physicsPreview,
    renderer: options.renderer,
    resizeTo: options.host,
    resolution: options.resolution,
    soundDestination: getEditorAudioDestination(),
    viewportPadding: EDITOR_VIEWPORT_PADDING,
  })
