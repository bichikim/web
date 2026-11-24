import type {VoiceMessage} from './text'

/** The source text actually being heard, rather than audio queued for later playback. */
export interface VoicePlayback {
  readonly message: VoiceMessage
  readonly offset: number
}
