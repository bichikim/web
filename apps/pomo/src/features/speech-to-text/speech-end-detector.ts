/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
const DETECTION_INTERVAL = 50
const REQUIRED_SPEECH_SAMPLES = 3
const SILENCE_DURATION = 800
const SILENCE_THRESHOLD = 0.01
const SPEECH_THRESHOLD = 0.018

export interface SpeechEndDetector {
  readonly dispose: () => void
  readonly subscribe: (onSpeechEnd: () => void) => () => void
}

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

const getRootMeanSquare = (samples: Float32Array) => {
  const energy = samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
  return Math.sqrt(energy)
}

/** Observes microphone energy without routing audio to an output device. */
export const createBrowserSpeechEndDetector = (stream: MediaStream): SpeechEndDetector | null => {
  if (typeof AudioContext === 'undefined') {
    return null
  }

  try {
    const context = new AudioContext()
    const analyser = context.createAnalyser()
    const source = context.createMediaStreamSource(stream)
    analyser.fftSize = 1024
    const samples = new Float32Array(analyser.fftSize)
    const state = createSpeechEndState()
    const listeners = new Set<() => void>()
    source.connect(analyser)
    context.resume().catch(() => undefined)

    const intervalId = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples)

      if (state.push({energy: getRootMeanSquare(samples), timestamp: performance.now()})) {
        for (const listener of listeners) {
          listener()
        }
      }
    }, DETECTION_INTERVAL)

    return {
      dispose: () => {
        window.clearInterval(intervalId)
        listeners.clear()
        source.disconnect()
        analyser.disconnect()
        context.close().catch(() => undefined)
      },
      subscribe: (onSpeechEnd) => {
        listeners.add(onSpeechEnd)
        return () => listeners.delete(onSpeechEnd)
      },
    }
  } catch {
    return null
  }
}
