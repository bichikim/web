import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {DEFAULT_OVERLAP_SECONDS} from './crossfade'
import {createSoundRuntime} from './runtime'
import type {
  SoundLayer,
  SoundPlayback,
  SoundPlayerStatus,
  SoundRuntime,
  SoundVoice,
  UseSoundPlayerProps,
  VoiceSettings,
} from './types'

interface Voice {
  readonly id: string
  readonly playback: SoundVoice
}
export const MAX_SOUND_LAYERS = 8
export const DEFAULT_SOUND_VOLUME = 0.5
const resolveSettings = (layer: SoundLayer): VoiceSettings => {
  const volume = layer.volume ?? DEFAULT_SOUND_VOLUME
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new Error('음량은 0부터 1 사이여야 합니다.')
  }
  return {
    enabled: layer.enabled !== false,
    loop: layer.loop ?? true,
    overlapSeconds: layer.overlapSeconds ?? DEFAULT_OVERLAP_SECONDS,
    volume,
  }
}
const validateLayers = (layers: readonly SoundLayer[]) => {
  if (layers.length === 0 || layers.length > MAX_SOUND_LAYERS) {
    throw new Error(`음원을 1개부터 ${MAX_SOUND_LAYERS}개까지 선택하세요.`)
  }
  if (new Set(layers.map((layer) => layer.id)).size !== layers.length) {
    throw new Error('음원 ID가 중복되었습니다.')
  }
  for (const layer of layers) {
    resolveSettings(layer)
  }
}
const configureVoices = (voices: readonly Voice[], layers: readonly SoundLayer[]) => {
  for (const voice of voices) {
    const layer = layers.find((candidate) => candidate.id === voice.id)
    if (layer !== undefined) {
      voice.playback.configure(resolveSettings(layer))
    }
  }
}

/** 여러 효과음을 독립적으로 반복·혼합하며 일시정지 위치를 보존한다. 디바이스 미디어 세션은 등록하지 않는다. */
export const useSoundPlayer = (props: UseSoundPlayerProps): SoundPlayback => {
  const [status, setStatus] = createSignal<SoundPlayerStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  let runtime: SoundRuntime | undefined
  let voices: Voice[] = []
  let revision = 0
  let disposed = false
  const release = () => {
    for (const voice of voices) {
      voice.playback.dispose()
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
      configureVoices(voices, layers)
    } catch (cause) {
      fail(cause)
    }
  })
  const loadVoice = async (layer: SoundLayer) => {
    if (runtime === undefined) {
      throw new Error('오디오 실행기가 준비되지 않았습니다.')
    }
    const voice: Voice = {
      id: layer.id,
      playback: runtime.createVoice({
        onEnded: () => {
          if (
            !disposed &&
            voices.includes(voice) &&
            status() === 'playing' &&
            voices.every((entry) => entry.playback.finished)
          ) {
            setStatus('idle')
          }
        },
      }),
    }
    voices.push(voice)
    await voice.playback.load(layer.source)
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
      runtime ??= await createSoundRuntime()
      if (disposed || request !== revision) {
        return
      }
      await runtime.resume()
      if (disposed || request !== revision) {
        return
      }
      if (voices.length === 0) {
        await Promise.all(layers.map((layer) => loadVoice(layer)))
        if (disposed || request !== revision) {
          return
        }
      }
      configureVoices(voices, untrack(props.layers))
      const time = runtime.now()
      for (const voice of voices) {
        voice.playback.play(time, resume)
      }
      setStatus('playing')
    } catch (cause) {
      if (!disposed && request === revision) {
        fail(cause)
      }
    }
  }
  const pause = () => {
    if (status() !== 'playing' || runtime === undefined) {
      return
    }
    const time = runtime.now()
    setStatus('paused')
    for (const voice of voices) {
      voice.playback.pause(time)
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
      voice.playback.stop()
    }
  }
  onCleanup(() => {
    disposed = true
    revision += 1
    release()
  })
  return {error, pause, play, status, stop}
}
