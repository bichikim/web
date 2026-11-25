import type {NativePlayerSurfaceKind} from './native-backend'

export type PlayerRendererPreference = 'auto' | 'pixi' | 'pixi-webgl' | 'pixi-webgpu' | 'wgpu'
export type PlayerAntialiasing = 'auto' | 'msaa' | 'ssaa'

export type PlayerGpuPresentation = 'auto' | 'when-ready' | 'animation-frame' | 'worker-canvas'

export interface FrameAlphaSize {
  readonly width: number
  readonly height: number
}

export interface FrameAlphaSample extends FrameAlphaSize {
  /** Caller-owned, row-major 8-bit alpha samples from the rendered frame. */
  readonly data: Uint8Array
}

export interface PlayerAlphaCapture {
  /** Called when wgpu submits a frame and no capture is pending. Omit a size to skip it. */
  readonly requestSize: () => FrameAlphaSize | undefined
  /** Receives a completed capture independently of color frame presentation. */
  readonly onSample: (sample: FrameAlphaSample) => void
  /** Receives a capture failure without invalidating the displayed frame. */
  readonly onError: (cause: Error) => void
}

export interface PlayerRenderingOptions {
  /**
   * Presentation for browser wgpu. Auto (the default) submits ready bitmaps without transferring
   * the canvas. An explicit choice fixes the presentation mode when browser wgpu is used.
   * Worker Canvas requires `renderer: 'wgpu'`, an unused transferable canvas, and no
   * before-render callback. Automatic renderer selection preserves the canvas for fallback.
   */
  readonly gpuPresentation?: PlayerGpuPresentation
  /**
   * Web renderer. Auto (the default) tries supported browser wgpu first and falls back to Pixi.
   * Pixi prefers WebGL to WebGPU. The remaining values require the selected renderer and API.
   */
  readonly renderer?: PlayerRendererPreference
  /** Auto retains MSAA. SSAA uses the caller's rendering resolution without multisampling. */
  readonly antialiasing?: PlayerAntialiasing
}

export interface PlayerRendererConfiguration extends PlayerRenderingOptions {
  /** New caller-owned canvas; it is published only after the returned request is applied. */
  readonly canvas: HTMLCanvasElement
}

export type PlayerFramePresentation = 'presented' | 'superseded' | 'destroyed'

export type PlayerRendererChange = 'applied' | 'superseded' | 'destroyed'

export interface PlayerRenderingInfo {
  /** Identifies a platform surface when drawing outside the browser. */
  readonly nativeSurface?: NativePlayerSurfaceKind
  /** Reported by Rust/wgpu; omission identifies the established Pixi implementation. */
  readonly runtime?: 'pixi' | 'wgpu'
  readonly renderer: 'webgl' | 'webgpu'
  readonly antialiasing: Exclude<PlayerAntialiasing, 'auto'>
}
