import type {SpeechToTextController} from '../..'

interface SpeechTestRoot {
  readonly controller: SpeechToTextController
  readonly dispose: () => void
}

export type {SpeechTestRoot}
