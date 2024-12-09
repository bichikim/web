import {Setter} from 'solid-js'
export interface LoadOptions {
  drm?: DrmOptions
}

export interface Streaming {
  stallEnabled?: boolean
}

export interface PlayerAPiOptions {
  api?: 'shaka'
  streaming?: Streaming
}

// none = undefined
export type DrmType = 'widevine-classic' | 'widevine-modular' | 'fire-play' | 'play-ready'

export interface DrmOptions {
  // 실제 사용?
  // customData?: any
  advanced?: Record<string, any>
  cookies?: string
  // 실제 사용 하나?
  // licenseToken?: string
  licenseUrl?: string
  servers?: Record<string, any>
  /**
   * drm type for wavve
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
