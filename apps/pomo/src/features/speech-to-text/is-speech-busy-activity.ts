import type {SpeechActivity} from './use-speech-to-text'

/** Reports whether speech input is waiting for or processing work. */
export const isSpeechBusyActivity = (activity: SpeechActivity): boolean =>
  activity === 'checking' || activity === 'processing' || activity === 'requesting'
