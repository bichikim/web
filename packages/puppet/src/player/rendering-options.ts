export type PlayerRendererPreference = 'auto' | 'webgl' | 'webgpu'
export type PlayerAntialiasing = 'auto' | 'msaa' | 'ssaa'

export interface PlayerRenderingOptions {
  /** Auto prefers WebGL, then WebGPU when supported. Explicit choices never fall back. */
  readonly renderer?: PlayerRendererPreference
  /** Auto retains MSAA. SSAA uses the caller's rendering resolution without multisampling. */
  readonly antialiasing?: PlayerAntialiasing
}

export interface PlayerRendererConfiguration extends PlayerRenderingOptions {
  /** New caller-owned canvas; it is published only after the returned request is applied. */
  readonly canvas: HTMLCanvasElement
}

export type PlayerRendererChange = 'applied' | 'superseded' | 'destroyed'

export interface PlayerRenderingInfo {
  readonly renderer: Exclude<PlayerRendererPreference, 'auto'>
  readonly antialiasing: Exclude<PlayerAntialiasing, 'auto'>
}
