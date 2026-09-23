import type {Accessor} from 'solid-js'

export interface SoundLayer {
  readonly id: string
  readonly source: string
  readonly title?: string
  readonly volume?: number
  readonly overlapSeconds?: number
  readonly loop?: boolean
  readonly enabled?: boolean
}
export interface UseSoundPlayerProps {
  readonly layers: Accessor<readonly SoundLayer[]>
}
export type SoundPlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
export interface SoundPlayback {
  readonly status: Accessor<SoundPlayerStatus>
  readonly error: Accessor<string | null>
  readonly play: () => Promise<void>
  readonly pause: () => void
  readonly stop: () => void
}

export interface VoiceSettings {
  readonly enabled: boolean
  readonly loop: boolean
  readonly overlapSeconds: number
  readonly volume: number
}

/** Owns one source; disposal ends its lifetime and explicit pause/stop do not report completion. */
export interface SoundVoice {
  readonly finished: boolean
  readonly load: (source: string) => Promise<void>
  readonly configure: (settings: VoiceSettings) => void
  readonly play: (time: number, resume: boolean) => void
  readonly pause: (time: number) => void
  readonly stop: () => void
  readonly dispose: () => void
}

export interface VoiceOptions {
  /** Reports natural completion after playback state has settled, excluding restarts. */
  readonly onEnded: () => void
}

export interface SoundRuntime {
  readonly resume: () => Promise<void>
  readonly now: () => number
  readonly createVoice: (options: VoiceOptions) => SoundVoice
}
