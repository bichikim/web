interface MicrophoneMeterOptions {
  readonly stream: MediaStream
  readonly onLevel: (level: number) => void
  readonly onError: (cause: unknown) => void
}

const SAMPLE_COUNT = 1024
const SILENCE_DECIBELS = -60
const LOUD_DECIBELS = -12
const ATTACK_SECONDS = 0.04
const RELEASE_SECONDS = 0.14
const MILLISECONDS = 1000
const SILENT_LEVEL = 0.005
const DECIBEL_SCALE = 20
const sampleLevel = (samples: Float32Array) => {
  const power = samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
  const decibels = DECIBEL_SCALE * Math.log10(Math.sqrt(power))
  return Math.max(
    0,
    Math.min(1, (decibels - SILENCE_DECIBELS) / (LOUD_DECIBELS - SILENCE_DECIBELS)),
  )
}
const reportClose = (cause: unknown) => console.warn('Microphone meter cleanup failed', cause)

/** Measures microphone PCM for display; it never connects the microphone to the speakers. */
export const createMicrophoneMeter = (props: MicrophoneMeterOptions): (() => void) => {
  const context = new AudioContext()
  try {
    const input = context.createMediaStreamSource(props.stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = SAMPLE_COUNT
    input.connect(analyser)
    const samples = new Float32Array(SAMPLE_COUNT)
    let frame = 0
    let previous: number | undefined
    let level = 0
    let disposed = false
    const dispose = () => {
      if (disposed) {
        return
      }
      disposed = true
      cancelAnimationFrame(frame)
      input.disconnect()
      analyser.disconnect()
      context.close().catch(reportClose)
      props.onLevel(0)
    }
    const update = (time: number) => {
      if (disposed) {
        return
      }
      analyser.getFloatTimeDomainData(samples)
      const target = sampleLevel(samples)
      const seconds = previous === undefined ? 0 : (time - previous) / MILLISECONDS
      const smoothing = target > level ? ATTACK_SECONDS : RELEASE_SECONDS
      level = target + (level - target) * Math.exp(-seconds / smoothing)
      previous = time
      props.onLevel(level < SILENT_LEVEL ? 0 : level)
      frame = requestAnimationFrame(update)
    }
    context.resume().then(
      () => {
        if (!disposed) {
          frame = requestAnimationFrame(update)
        }
      },
      (cause: unknown) => {
        if (!disposed) {
          dispose()
          props.onError(cause)
        }
      },
    )
    return dispose
  } catch (cause) {
    context.close().catch(reportClose)
    throw cause
  }
}
