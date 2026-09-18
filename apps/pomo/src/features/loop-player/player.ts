import {DEFAULT_CONNECTION_SECONDS} from '../sound-generation/connection'

export interface LoopPlayback {
  seek: (seconds: number) => Promise<void>
  setVolume: (volume: number) => void
  stop: () => void
  close: () => Promise<void>
  play: (connectionSeconds?: number, preview?: boolean, position?: number) => Promise<void>
}

/** Streams one URL through two alternating players; the connection duration defaults to four seconds. */
export function createLoopPlayer(
  url: string,
  onStatus: (message: string, playing: boolean) => void,
  onReady: (duration: number) => void,
  onPosition?: (seconds: number) => void,
): LoopPlayback {
  const context = new AudioContext()
  const audio = [createLoopAudio(url), createLoopAudio(url)]
  const {gains, masterGain} = connectPlayers(context, audio)
  let playing = false
  let revision = 0
  let current = 0
  let transitioning = false
  let nextPlayback: Promise<void> | null = null
  let connectionSeconds = DEFAULT_CONNECTION_SECONDS
  let closed = false
  const stop = () => {
    revision += 1
    playing = false
    transitioning = false
    nextPlayback = null
    for (const [index, element] of audio.entries()) {
      element.pause()
      gains[index].gain.cancelScheduledValues(context.currentTime)
      gains[index].gain.setValueAtTime(0, context.currentTime)
    }
  }
  const fail = (cause: unknown) => {
    stop()
    onStatus(cause instanceof Error ? cause.message : '재생하지 못했습니다.', false)
  }
  const transition = async () => {
    const active = audio[current]
    if (
      !playing ||
      transitioning ||
      active.paused ||
      active.duration - active.currentTime > connectionSeconds
    ) {
      return
    }
    transitioning = true
    nextPlayback = null
    const token = revision
    const next = 1 - current
    audio[next].currentTime = 0
    gains[next].gain.setValueAtTime(0, context.currentTime)
    try {
      nextPlayback = audio[next].play()
      await nextPlayback
      if (token !== revision) {
        return
      }
      const remaining = Math.max(0, active.duration - active.currentTime)
      crossfade(context, gains[current], gains[next], remaining)
      onStatus(`${connectionSeconds}초 크로스페이드 중`, true)
    } catch (cause) {
      if (token === revision) {
        fail(cause)
      }
    }
  }
  observeAudio(audio, onReady, fail, () => closed)
  bindPlaybackEvents(audio, {
    current: () => current,
    ended: () => {
      const token = revision
      const finish = async () => {
        if (nextPlayback === null) {
          await play(connectionSeconds).catch(fail)
          return
        }
        await nextPlayback
        if (token !== revision) {
          return
        }
        current = 1 - current
        transitioning = false
        nextPlayback = null
        onPosition?.(audio[current].currentTime)
        onStatus('루프 재생 중', true)
      }
      finish().catch((cause: unknown) => {
        if (token === revision) {
          fail(cause)
        }
      })
    },
    onError: fail,
    onPosition,
    playing: () => playing,
    transition,
  })
  const play = async (
    requestedConnectionSeconds = DEFAULT_CONNECTION_SECONDS,
    preview = false,
    position = 0,
  ) => {
    const [{duration}] = audio
    validatePlayback(duration, position, requestedConnectionSeconds, closed)
    stop()
    connectionSeconds = requestedConnectionSeconds
    current = 0
    const token = revision
    const resumeRequest = context.resume()
    audio[0].currentTime = getStartPosition(duration, connectionSeconds, preview, position)
    onPosition?.(audio[0].currentTime)
    gains[0].gain.setValueAtTime(1, context.currentTime)
    try {
      const playRequest = audio[0].play()
      await Promise.all([resumeRequest, playRequest])
      if (token !== revision) {
        return
      }
      playing = true
      onStatus('루프 재생 중', true)
    } catch (cause) {
      if (token === revision) {
        stop()
        throw cause
      }
    }
  }
  const seek = async (seconds: number) => {
    validatePosition(seconds, audio[0].duration, closed)
    if (playing) {
      await play(connectionSeconds, false, seconds)
      return
    }
    stop()
    current = 0
    audio[0].currentTime = seconds === audio[0].duration ? 0 : seconds
    onPosition?.(audio[0].currentTime)
  }
  const setVolume = (volume: number) => setMasterVolume(context, masterGain, volume, closed)
  const close = async () => {
    if (closed) {
      return
    }
    stop()
    closed = true
    disconnectPlayers(audio, gains, masterGain)
    await context.close()
  }
  return {close, play, seek, setVolume, stop}
}

interface PlaybackEventHandlers {
  readonly current: () => number
  readonly ended: () => void
  readonly onError: (cause: unknown) => void
  readonly onPosition?: (seconds: number) => void
  readonly playing: () => boolean
  readonly transition: () => Promise<void>
}

function bindPlaybackEvents(audio: HTMLAudioElement[], handlers: PlaybackEventHandlers): void {
  audio.forEach((element, index) => {
    element.ontimeupdate = () => {
      if (index === handlers.current()) {
        handlers.onPosition?.(element.currentTime)
        handlers.transition().catch(handlers.onError)
      }
    }
    element.onended = () => {
      if (handlers.playing() && index === handlers.current()) {
        handlers.ended()
      }
    }
  })
}

function createLoopAudio(url: string): HTMLAudioElement {
  const element = new Audio()
  element.crossOrigin = 'anonymous'
  element.src = url
  return element
}

function connectPlayers(context: AudioContext, audio: HTMLAudioElement[]) {
  const gains = audio.map((element) => {
    element.preload = 'auto'
    const gain = context.createGain()
    context.createMediaElementSource(element).connect(gain)
    return gain
  })
  const masterGain = context.createGain()
  gains.forEach((gain) => gain.connect(masterGain))
  masterGain.connect(context.destination)
  return {gains, masterGain}
}

function disconnectPlayers(audio: HTMLAudioElement[], gains: GainNode[], masterGain: GainNode) {
  for (const element of audio) {
    element.ontimeupdate = null
    element.onended = null
    element.onerror = null
    element.onloadedmetadata = null
    element.removeAttribute('src')
    element.load()
  }
  gains.forEach((gain) => gain.disconnect())
  masterGain.disconnect()
}

function validatePlayback(
  duration: number,
  position: number,
  connectionSeconds: number,
  closed: boolean,
) {
  validatePosition(position, duration, closed)
  if (
    !Number.isFinite(duration) ||
    !Number.isFinite(connectionSeconds) ||
    connectionSeconds <= 0 ||
    connectionSeconds > duration / 2
  ) {
    throw new Error('오디오 로딩 후, 연결 구간을 0초 초과·음원 길이의 절반 이하로 설정해 주세요.')
  }
}

function validatePosition(position: number, duration: number, closed: boolean) {
  if (
    closed ||
    !Number.isFinite(duration) ||
    !Number.isFinite(position) ||
    position < 0 ||
    position > duration
  ) {
    throw new Error('재생 위치가 올바르지 않습니다.')
  }
}

function validateVolume(volume: number, closed: boolean) {
  if (closed || !Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new Error('음량은 0에서 1 사이여야 합니다.')
  }
}

function setMasterVolume(
  context: AudioContext,
  masterGain: GainNode,
  volume: number,
  closed: boolean,
) {
  validateVolume(volume, closed)
  const now = context.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(volume, now)
}

function crossfade(context: AudioContext, active: GainNode, next: GainNode, remaining: number) {
  const now = context.currentTime
  active.gain.cancelScheduledValues(now)
  active.gain.setValueAtTime(1, now)
  active.gain.linearRampToValueAtTime(0, now + remaining)
  next.gain.cancelScheduledValues(now)
  next.gain.setValueAtTime(0, now)
  next.gain.linearRampToValueAtTime(1, now + remaining)
}

function observeAudio(
  audio: HTMLAudioElement[],
  onReady: (duration: number) => void,
  onError: (cause: unknown) => void,
  isClosed: () => boolean,
) {
  for (const element of audio) {
    element.onloadedmetadata = () => {
      if (!isClosed() && audio.every((item) => Number.isFinite(item.duration))) {
        onReady(audio[0].duration)
      }
    }
    element.onerror = () => {
      if (!isClosed()) {
        onError(new Error('이 오디오 파일을 재생할 수 없습니다.'))
      }
    }
  }
}

function getStartPosition(
  duration: number,
  connectionSeconds: number,
  preview: boolean,
  position: number,
) {
  if (preview) {
    return Math.max(0, duration - connectionSeconds - 1)
  }
  return position === duration ? 0 : position
}
