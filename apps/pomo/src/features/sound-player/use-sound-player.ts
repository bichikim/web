import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import type {Player} from 'tone'
import {createCrossfadeBuffer, DEFAULT_OVERLAP_SECONDS, resolveLoopPosition} from './crossfade'

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
interface Voice {
  readonly id: string
  readonly player: Player
  offset: number
  startedAt: number
  finished: boolean
  original?: AudioBuffer
  overlap?: number
}
export const MAX_SOUND_LAYERS = 8
export const DEFAULT_SOUND_VOLUME = 0.5
const VOLUME_RAMP_SECONDS = 0.05
const getVolume = (layer: SoundLayer) => {
  const volume = layer.volume ?? DEFAULT_SOUND_VOLUME
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new Error('음량은 0부터 1 사이여야 합니다.')
  }
  return volume
}

const validateLayers = (layers: readonly SoundLayer[]) => {
  if (layers.length === 0 || layers.length > MAX_SOUND_LAYERS) {
    throw new Error(`음원을 1개부터 ${MAX_SOUND_LAYERS}개까지 선택하세요.`)
  }
  if (new Set(layers.map((layer) => layer.id)).size !== layers.length) {
    throw new Error('음원 ID가 중복되었습니다.')
  }
  for (const layer of layers) {
    getVolume(layer)
  }
}

const configureLoop = (voice: Voice, layer: SoundLayer) => {
  const {original} = voice
  if (original === undefined) {
    return
  }
  const loop = layer.loop ?? true
  const overlap = loop ? (layer.overlapSeconds ?? DEFAULT_OVERLAP_SECONDS) : 0
  if (voice.overlap === overlap && voice.player.loop === loop) {
    return
  }
  const buffer =
    overlap === 0 ? original : createCrossfadeBuffer({buffer: original, overlapSeconds: overlap})
  const time = voice.player.now()
  const playing = voice.player.state === 'started'
  if (playing) {
    const position = voice.offset + Math.max(0, time - voice.startedAt)
    voice.offset = voice.player.loop
      ? resolveLoopPosition({
          duration: original.duration,
          loopStart: Number(voice.player.loopStart),
          position,
        })
      : Math.min(position, original.duration)
    voice.player.stop(time)
  }
  voice.player.buffer.set(buffer)
  voice.player.loopStart = Math.round(overlap * original.sampleRate) / original.sampleRate
  voice.player.loopEnd = original.duration
  voice.player.loop = loop
  voice.overlap = overlap
  if (playing) {
    voice.startedAt = time
    voice.player.start(time, voice.offset)
  }
}

interface ConfigureVoicesOptions {
  readonly voices: readonly Voice[]
  readonly layers: readonly SoundLayer[]
  readonly tone: typeof import('tone') | undefined
}
const configureVoices = (options: ConfigureVoicesOptions) => {
  for (const voice of options.voices) {
    const layer = options.layers.find((candidate) => candidate.id === voice.id)
    if (layer !== undefined && options.tone !== undefined) {
      configureLoop(voice, layer)
      voice.player.mute = layer.enabled === false
      voice.player.volume.rampTo(options.tone.gainToDb(getVolume(layer)), VOLUME_RAMP_SECONDS)
    }
  }
}

/** 여러 효과음을 독립적으로 반복·혼합하며 일시정지 위치를 보존한다. 디바이스 미디어 세션은 등록하지 않는다. */
export const useSoundPlayer = (props: UseSoundPlayerProps): SoundPlayback => {
  const [status, setStatus] = createSignal<SoundPlayerStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  let tone: typeof import('tone') | undefined
  let voices: Voice[] = []
  let revision = 0
  let disposed = false
  const release = () => {
    for (const voice of voices) {
      voice.player.dispose()
    }
    voices = []
  }
  const fail = (cause: unknown) => {
    revision += 1
    release()
    setError(cause instanceof Error ? cause.message : '효과음을 재생하지 못했습니다.')
    setStatus('error')
  }
  let sourceKey = ''
  createEffect(() => {
    const layers = props.layers()
    const nextKey = JSON.stringify(layers.map((layer) => [layer.id, layer.source]))
    if (sourceKey !== nextKey) {
      sourceKey = nextKey
      revision += 1
      release()
      setStatus('idle')
      setError(null)
    }
    try {
      configureVoices({layers, tone, voices})
    } catch (cause) {
      fail(cause)
    }
  })
  const loadVoice = async (layer: SoundLayer) => {
    if (tone === undefined) {
      throw new Error('오디오 실행기가 준비되지 않았습니다.')
    }
    const player = new tone.Player({loop: layer.loop ?? true}).toDestination()
    const voice: Voice = {finished: false, id: layer.id, offset: 0, player, startedAt: 0}
    voices.push(voice)
    player.onstop = () => {
      queueMicrotask(() => {
        if (
          disposed ||
          !voices.includes(voice) ||
          status() !== 'playing' ||
          player.loop ||
          player.state === 'started'
        ) {
          return
        }
        voice.finished = true
        if (voices.every((entry) => entry.finished)) {
          setStatus('idle')
        }
      })
    }
    await player.load(layer.source)
    voice.original = player.buffer.get()
    if (!Number.isFinite(player.buffer.duration) || player.buffer.duration <= 0) {
      throw new Error('재생할 수 있는 오디오가 아닙니다.')
    }
  }
  const play = async () => {
    if (disposed || status() === 'playing' || status() === 'loading') {
      return
    }
    const resume = status() === 'paused'
    const layers = untrack(props.layers)
    const request = (revision += 1)
    setError(null)
    setStatus('loading')
    try {
      validateLayers(layers)
      tone = await import('tone')
      if (disposed || request !== revision) {
        return
      }
      await tone.start()
      if (disposed || request !== revision) {
        return
      }
      if (voices.length === 0) {
        await Promise.all(layers.map((layer) => loadVoice(layer)))
        if (disposed || request !== revision) {
          return
        }
      }
      configureVoices({layers: untrack(props.layers), tone, voices})
      const time = tone.now()
      for (const voice of voices.filter((entry) => !resume || !entry.finished)) {
        if (voice.finished) {
          voice.offset = 0
          voice.finished = false
        }
        voice.startedAt = time
        voice.player.start(time, voice.offset)
      }
      setStatus('playing')
    } catch (cause) {
      if (!disposed && request === revision) {
        fail(cause)
      }
    }
  }
  const pause = () => {
    if (status() !== 'playing' || tone === undefined) {
      return
    }
    const time = tone.now()
    setStatus('paused')
    for (const voice of voices) {
      if (!voice.finished) {
        const offset = voice.offset + Math.max(0, time - voice.startedAt)
        voice.offset = voice.player.loop
          ? resolveLoopPosition({
              duration: voice.player.buffer.duration,
              loopStart: Number(voice.player.loopStart),
              position: offset,
            })
          : Math.min(offset, voice.player.buffer.duration)
        voice.player.stop(time)
      }
    }
  }
  const stop = () => {
    const wasLoading = status() === 'loading'
    revision += 1
    setStatus('idle')
    setError(null)
    if (wasLoading) {
      release()
      return
    }
    for (const voice of voices) {
      voice.player.stop()
      voice.offset = 0
      voice.finished = false
    }
  }
  onCleanup(() => {
    disposed = true
    revision += 1
    release()
  })
  return {error, pause, play, status, stop}
}
