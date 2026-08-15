import {type Accessor, createSignal, onCleanup} from 'solid-js'

/* oxlint-disable eslint/no-magic-numbers -- Deliberate idle VU-meter silhouette. */
const IDLE_LEVELS = [
  18, 26, 36, 48, 38, 58, 74, 60, 42, 52, 70, 88, 72, 48, 60, 78, 62, 44, 56, 72, 52, 38, 28, 20,
] as const
/* oxlint-enable eslint/no-magic-numbers */
const LEVEL_COUNT = IDLE_LEVELS.length
const MINIMUM_LEVEL = 12
const MAXIMUM_LEVEL = 100
const BYTE_MAXIMUM = 255
const LEVEL_GAIN = 112

export interface PAudioVisualizer {
  readonly levels: Accessor<readonly number[]>
  readonly start: (audioElement: HTMLAudioElement) => void
  readonly stop: () => void
}

export const usePAudioVisualizer = (): PAudioVisualizer => {
  const [levels, setLevels] = createSignal<readonly number[]>(IDLE_LEVELS)
  let audioContext: AudioContext | undefined
  let analyserNode: AnalyserNode | undefined
  let mediaSource: MediaElementAudioSourceNode | undefined
  let spectrumData: Uint8Array<ArrayBuffer> | undefined
  let animationFrame: number | undefined
  let active = false
  let disposed = false

  const stopAnimation = () => {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame)
      animationFrame = undefined
    }
    if (!disposed) {
      setLevels(IDLE_LEVELS)
    }
  }

  const initialize = async (audioElement: HTMLAudioElement) => {
    const context = (audioContext ??= new AudioContext())

    if (context.state === 'suspended') {
      await context.resume()
    }

    analyserNode ??= context.createAnalyser()
    analyserNode.fftSize = 128
    analyserNode.smoothingTimeConstant = 0.78
    spectrumData ??= new Uint8Array(analyserNode.frequencyBinCount)

    if (!mediaSource) {
      mediaSource = context.createMediaElementSource(audioElement)
      mediaSource.connect(analyserNode)
      analyserNode.connect(context.destination)
    }
  }

  const updateLevels = () => {
    const analyser = analyserNode
    const spectrum = spectrumData

    if (!active || analyser === undefined || spectrum === undefined) {
      return
    }

    analyser.getByteFrequencyData(spectrum)
    const bucketSize = Math.max(1, Math.floor(spectrum.length / LEVEL_COUNT))
    const nextLevels = Array.from({length: LEVEL_COUNT}, (_, index) => {
      const start = index * bucketSize
      const end = Math.min(spectrum.length, start + bucketSize)
      let sum = 0

      for (let spectrumIndex = start; spectrumIndex < end; spectrumIndex += 1) {
        sum += spectrum[spectrumIndex]
      }

      const average = sum / Math.max(1, end - start)

      return Math.max(
        MINIMUM_LEVEL,
        Math.min(MAXIMUM_LEVEL, Math.round((average / BYTE_MAXIMUM) * LEVEL_GAIN)),
      )
    })

    setLevels(nextLevels)
    animationFrame = requestAnimationFrame(updateLevels)
  }

  const start = (audioElement: HTMLAudioElement) => {
    active = true
    initialize(audioElement)
      .then(() => {
        if (disposed || !active) {
          return
        }

        if (animationFrame !== undefined) {
          cancelAnimationFrame(animationFrame)
        }
        updateLevels()
      })
      .catch(stopAnimation)
  }

  const stop = () => {
    active = false
    stopAnimation()
  }

  onCleanup(() => {
    disposed = true
    active = false
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame)
    }
    mediaSource?.disconnect()
    analyserNode?.disconnect()
    audioContext?.close().catch(() => undefined)
  })

  return {levels, start, stop}
}
