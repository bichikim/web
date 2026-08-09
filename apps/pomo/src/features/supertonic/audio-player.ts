import type {SupertonicAudio} from './messages'

export interface SupertonicAudioPlayer {
  readonly dispose: () => void
  readonly enqueue: (audio: SupertonicAudio, silenceDuration: number) => void
  readonly finish: () => void
}

/** Creates a click-activated Web Audio queue that plays generated chunks in order. */
export const createSupertonicAudioPlayer = (): SupertonicAudioPlayer => {
  const context = new AudioContext()
  const sources = new Set<AudioBufferSourceNode>()
  let finished = false
  let nextStartTime = context.currentTime

  const closeIfFinished = () => {
    if (finished && sources.size === 0 && context.state !== 'closed') {
      context.close().catch(() => undefined)
    }
  }

  const enqueue = (audio: SupertonicAudio, silenceDuration: number) => {
    const buffer = context.createBuffer(1, audio.samples.length, audio.sampleRate)
    buffer.copyToChannel(new Float32Array(audio.samples), 0)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    sources.add(source)
    source.addEventListener('ended', () => {
      sources.delete(source)
      closeIfFinished()
    })
    const startTime = Math.max(context.currentTime, nextStartTime)
    source.start(startTime)
    nextStartTime = startTime + buffer.duration + silenceDuration
  }

  const finish = () => {
    finished = true
    closeIfFinished()
  }

  const dispose = () => {
    for (const source of sources) {
      source.stop()
    }

    sources.clear()

    if (context.state !== 'closed') {
      context.close().catch(() => undefined)
    }
  }

  context.resume().catch(() => undefined)
  return {dispose, enqueue, finish}
}
