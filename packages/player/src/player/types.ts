export interface LoadOptions {
  cookies?: string
  drm?: DrmOptions
}

export interface Streaming {
  stallEnabled?: boolean
}

export interface PlayerAPiOptions {
  api?: 'shaka'
  // modernBrowsersOnly
  modernBrowsersOnly?: boolean
  streaming?: Streaming
}

// none = undefined
export type DrmType = 'widevine-classic' | 'widevine-modular' | 'fire-play' | 'play-ready'

export interface DrmOptions {
  advanced?: Record<string, any>
  /**
   * 커스컴 팔콘 규격 정보
   */
  customData?: string
  /**
   * 라이센스 다른 업체 (내부 서버?)
   */
  licenseToken?: string
  licenseUrl?: string
  servers?: Record<string, any>

  /**
   * drm type for custom service
   * none = undefined
   */
  type?: DrmType
}

export interface PlayerStateReadonly {
  readonly duration: number
  readonly seeking: boolean
}

export interface PlayerStateMutable {
  readonly currentTime: number
  readonly muted: boolean
  readonly paused: boolean
  readonly volume: number
}

export type PlayerState = PlayerStateReadonly & PlayerStateMutable

export interface PlayerLoadApi {
  destroy: () => Promise<void> | void
  load: (url: string, options?: LoadOptions) => Promise<void>
}

export interface PlayerElementApi {
  pause: () => void
  play: () => Promise<void>
}

export type PlayerApi = PlayerElementApi & PlayerLoadApi
