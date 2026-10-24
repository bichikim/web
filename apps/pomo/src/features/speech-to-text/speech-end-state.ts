const REQUIRED_SPEECH_SAMPLES = 3
const SILENCE_DURATION = 800
const SILENCE_THRESHOLD = 0.01
const SPEECH_THRESHOLD = 0.018

export interface SpeechEndSample {
  readonly energy: number
  readonly timestamp: number
}

export interface SpeechEndState {
  readonly push: (sample: SpeechEndSample) => boolean
}

export const createSpeechEndState = (): SpeechEndState => {
  let consecutiveSpeech = 0
  let lastSpeechAt = 0
  let speechActive = false

  const push = (sample: SpeechEndSample) => {
    if (sample.energy >= SPEECH_THRESHOLD) {
      consecutiveSpeech += 1
      lastSpeechAt = sample.timestamp
      speechActive ||= consecutiveSpeech >= REQUIRED_SPEECH_SAMPLES
      return false
    }

    consecutiveSpeech = 0

    if (!speechActive) {
      return false
    }

    if (sample.energy >= SILENCE_THRESHOLD) {
      lastSpeechAt = sample.timestamp
      return false
    }

    if (sample.timestamp - lastSpeechAt < SILENCE_DURATION) {
      return false
    }

    speechActive = false
    return true
  }

  return {push}
}
