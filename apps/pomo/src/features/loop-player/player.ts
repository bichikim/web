const POLL_MS = 50
const DEFAULT_OVERLAP = 4

export interface LoopPlayback {
  seek: (seconds: number) => Promise<void>
  stop: () => void
  close: () => Promise<void>
  play: (overlap?: number, preview?: boolean, position?: number) => Promise<void>
}

/** Streams one URL through two alternating players; overlap defaults to four seconds. */
export function createLoopPlayer(
  url: string,
  onStatus: (message: string, playing: boolean) => void,
  onReady: (duration: number) => void,
  onPosition?: (seconds: number) => void,
): LoopPlayback {
  const context = new AudioContext()
  const audio = [new Audio(url), new Audio(url)]
  const gains = connectPlayers(context, audio)
  let timer: ReturnType<typeof setInterval> | undefined
  let revision = 0
  let current = 0
  let transitioning = false
  let nextReady = false
  let overlap = DEFAULT_OVERLAP
  let closed = false
  const stop = () => {
    revision += 1
    clearInterval(timer)
    timer = undefined
    transitioning = false
    nextReady = false
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
    if (transitioning || active.paused || active.duration - active.currentTime > overlap) {
      return
    }
    transitioning = true
    nextReady = false
    const token = revision
    const next = 1 - current
    audio[next].currentTime = 0
    gains[next].gain.setValueAtTime(0, context.currentTime)
    try {
      await audio[next].play()
      if (token !== revision) {
        return
      }
      nextReady = true
      const remaining = Math.max(0, active.duration - active.currentTime)
      const now = context.currentTime
      gains[current].gain.cancelScheduledValues(now)
      gains[current].gain.setValueAtTime(1, now)
      gains[current].gain.linearRampToValueAtTime(0, now + remaining)
      gains[next].gain.cancelScheduledValues(now)
      gains[next].gain.setValueAtTime(0, now)
      gains[next].gain.linearRampToValueAtTime(1, now + remaining)
      onStatus(`${overlap}초 크로스페이드 중`, true)
    } catch (cause) {
      if (token === revision) {
        fail(cause)
      }
    }
  }
  audio.forEach((element, index) => {
    element.onloadedmetadata = () => {
      if (!closed && audio.every((item) => Number.isFinite(item.duration))) {
        onReady(audio[0].duration)
      }
    }
    element.ontimeupdate = () => {
      if (index === current) {
        onPosition?.(element.currentTime)
      }
    }
    element.onended = () => {
      if (timer === undefined || index !== current) {
        return
      }
      if (!nextReady) {
        fail(new Error('다음 재생을 준비하지 못했습니다. 다시 재생해 주세요.'))
        return
      }
      current = 1 - current
      transitioning = false
      onPosition?.(audio[current].currentTime)
      onStatus('루프 재생 중', true)
    }
    element.onerror = () => {
      if (!closed) {
        fail(new Error('이 오디오 파일을 재생할 수 없습니다.'))
      }
    }
  })
  const play = async (seconds = DEFAULT_OVERLAP, preview = false, position = 0) => {
    const [{duration}] = audio
    validatePlayback(duration, position, seconds, closed)
    stop()
    overlap = seconds
    current = 0
    const token = revision
    await context.resume()
    if (token !== revision) {
      return
    }
    audio[0].currentTime = preview
      ? Math.max(0, duration - seconds - 1)
      : position === duration
        ? 0
        : position
    onPosition?.(audio[0].currentTime)
    gains[0].gain.setValueAtTime(1, context.currentTime)
    try {
      await audio[0].play()
      if (token !== revision) {
        return
      }
      timer = setInterval(() => {
        transition().catch(fail)
      }, POLL_MS)
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
    if (timer !== undefined) {
      await play(overlap, false, seconds)
      return
    }
    stop()
    current = 0
    audio[0].currentTime = seconds === audio[0].duration ? 0 : seconds
    onPosition?.(audio[0].currentTime)
  }
  const close = async () => {
    if (closed) {
      return
    }
    stop()
    closed = true
    disconnectPlayers(audio, gains)
    await context.close()
  }
  return {close, play, seek, stop}
}

function connectPlayers(context: AudioContext, audio: HTMLAudioElement[]) {
  return audio.map((element) => {
    element.preload = 'auto'
    const gain = context.createGain()
    context.createMediaElementSource(element).connect(gain)
    gain.connect(context.destination)
    return gain
  })
}

function disconnectPlayers(audio: HTMLAudioElement[], gains: GainNode[]) {
  for (const element of audio) {
    element.ontimeupdate = null
    element.onended = null
    element.onerror = null
    element.onloadedmetadata = null
    element.removeAttribute('src')
    element.load()
  }
  gains.forEach((gain) => gain.disconnect())
}

function validatePlayback(duration: number, position: number, overlap: number, closed: boolean) {
  validatePosition(position, duration, closed)
  if (
    !Number.isFinite(duration) ||
    !Number.isFinite(overlap) ||
    overlap <= 0 ||
    overlap > duration / 2
  ) {
    throw new Error('오디오 로딩 후, 겹침을 0초 초과·음원 길이의 절반 이하로 설정해 주세요.')
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
