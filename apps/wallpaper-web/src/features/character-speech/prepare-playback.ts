import {prepareSpeechLine} from './configuration'
import {createMouthTrack, MOUTH_DURATION_TOLERANCE} from './mouth-track'
import {loadPresetSpeech} from './presets'
import type {CachedSpeech, PreparedSpeechPlayback, SpeechCache} from './types'

interface PrepareSpeechPlaybackOptions {
  /** 압축 음성과 입 모양을 원자적으로 저장하는 캐시. */
  readonly cache: SpeechCache
  /** 정규화된 대사의 기존 프로필 키를 계산한다. */
  readonly getCacheKey: (text: string) => Promise<string>
  /** 프리셋 에셋을 요청하며 합성 모델은 요청하지 않는다. */
  readonly fetch: typeof fetch
  /** 호출자가 제공한 오디오 컨텍스트를 빌려 사용한다. */
  readonly context: Pick<AudioContext, 'decodeAudioData'>
  /** 캐시 미스일 때 정규화된 대사의 MP3를 생성한다. */
  readonly generate: (text: string) => Promise<Blob>
  /** 사용자가 입력한 대사이며 처리 전에 정규화한다. */
  readonly input: string
  /** 저장소 접근 실패 시 호출하며 생략하면 별도 알림 없이 계속한다. */
  readonly onCacheError?: () => void
  /** 취소 또는 세션 종료를 전달하는 신호다. */
  readonly signal: AbortSignal
}

const readCachedPlayback = async (
  key: string,
  options: PrepareSpeechPlaybackOptions,
): Promise<PreparedSpeechPlayback | null> => {
  const cached = await options.cache.read(key)
  options.signal.throwIfAborted()
  if (!cached.ok) {
    options.onCacheError?.()
    return null
  }
  const clip = cached.value
  if (clip === null) {
    return null
  }
  try {
    const audio = await options.context.decodeAudioData(await clip.audio.arrayBuffer())
    if (Math.abs(audio.duration - clip.mouth.duration) > MOUTH_DURATION_TOLERANCE) {
      throw new Error('Cached speech duration differs from mouth track')
    }
    return {audio, mouth: clip.mouth}
  } catch (cause) {
    options.signal.throwIfAborted()
    console.warn('Cached speech decode failed; regenerating', cause)
    const removed = await options.cache.remove(key)
    if (!removed.ok) {
      options.onCacheError?.()
    }
    return null
  }
}

export const prepareSpeechPlayback = async (
  options: PrepareSpeechPlaybackOptions,
): Promise<PreparedSpeechPlayback> => {
  const text = prepareSpeechLine(options.input)
  const key = await options.getCacheKey(text)
  const preset = await loadPresetSpeech({
    context: options.context,
    fetch: options.fetch,
    key,
    signal: options.signal,
    text,
  })
  if (preset !== null) {
    return preset
  }
  const cached = await readCachedPlayback(key, options)
  options.signal.throwIfAborted()
  if (cached !== null) {
    return cached
  }
  const compressed = await options.generate(text)
  options.signal.throwIfAborted()
  const audio = await options.context.decodeAudioData(await compressed.arrayBuffer())
  options.signal.throwIfAborted()
  const clip: CachedSpeech = {
    audio: compressed,
    mouth: createMouthTrack({sampleRate: audio.sampleRate, samples: audio.getChannelData(0)}, text),
  }
  const stored = await options.cache.write(key, clip)
  if (!stored.ok) {
    options.onCacheError?.()
  }
  options.signal.throwIfAborted()
  return {audio, mouth: clip.mouth}
}
