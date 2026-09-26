import {getExceptionMessage} from 'src/features/error-detail'
import {clamp} from 'es-toolkit/math'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'

import {
  createLoopPlaybackControls,
  createLoopPlayer,
  type LoopPlayback,
} from 'src/features/loop-player'

export interface CrossfadeAudioProps {
  readonly autoPlay?: boolean
  readonly connectionSeconds: number
  readonly initialPosition?: number
  readonly onStateChange?: (state: CrossfadePlaybackState) => void
  readonly url: string
}

export interface CrossfadePlaybackState {
  readonly playing: boolean
  readonly position: number
}

// oxlint-disable-next-line eslint/max-lines-per-function -- This component owns one disposable playback lifecycle and its view state.
export function CrossfadeAudio(props: CrossfadeAudioProps) {
  const [duration, setDuration] = createSignal(0)
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('재생 준비 중…')
  let playback: LoopPlayback | undefined
  let autoPlayed = false
  let currentConnection: number | undefined
  const controls = createLoopPlaybackControls({
    onSeekError: (cause) => {
      setPlaying(false)
      setStatus(getExceptionMessage(cause, '위치를 이동하지 못했습니다.'))
    },
    player: () => playback,
  })
  const {position, previewPosition, seek} = controls

  const close = (preserveState = false) => {
    controls.invalidate()
    const current = playback
    playback = undefined
    if (current !== undefined) {
      if (preserveState) {
        props.onStateChange?.({playing: playing(), position: position()})
      }
      current.close().catch((cause) => console.warn('Audio cleanup failed', cause))
    }
    setPlaying(false)
    controls.cancelScrubbing()
  }

  const connection = () =>
    duration() > 0 ? Math.min(props.connectionSeconds, duration() / 2) : props.connectionSeconds
  const displayedConnection = () => {
    const value = duration() > 0 ? connection() : props.connectionSeconds
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
  }
  const play = async (requestedPosition = position()) => {
    controls.invalidate()
    const current = playback
    if (current === undefined || duration() <= 0) {
      return
    }
    const target = clamp(requestedPosition, 0, duration())
    controls.preparePlayback(target)
    try {
      await current.play(connection(), false, target)
    } catch (cause) {
      setPlaying(false)
      setStatus(getExceptionMessage(cause, '재생하지 못했습니다.'))
    }
  }

  createEffect(() => {
    // Read the prop inside the effect so a changed generated URL recreates the player.
    // oxlint-disable-next-line eslint/prefer-destructuring -- Reactive prop access must stay inside the tracked effect.
    const url = props.url
    const initialPosition = untrack(() => props.initialPosition ?? 0)
    close()
    autoPlayed = false
    currentConnection = undefined
    setDuration(0)
    controls.updatePosition(Math.max(initialPosition, 0))
    setStatus('재생 준비 중…')
    try {
      playback = createLoopPlayer(
        url,
        (message, active) => {
          setStatus(message)
          setPlaying(active)
        },
        (seconds) => {
          setDuration(seconds)
          setStatus('재생 준비 완료')
        },
        controls.updatePosition,
      )
    } catch (cause) {
      setStatus(getExceptionMessage(cause, '오디오 플레이어를 준비하지 못했습니다.'))
    }
  })

  createEffect(() => {
    const readyDuration = duration()
    if (!props.autoPlay || readyDuration <= 0 || autoPlayed || playback === undefined) {
      return
    }
    autoPlayed = true
    play(props.initialPosition ?? position()).catch(() => undefined)
  })

  createEffect(() => {
    const nextConnection = connection()
    const current = playback
    if (currentConnection === nextConnection) {
      return
    }
    currentConnection = nextConnection
    if (current === undefined || !playing()) {
      return
    }
    play(untrack(position)).catch(() => undefined)
  })

  const togglePlayback = async () => {
    const current = playback
    if (current === undefined || duration() <= 0) {
      return
    }
    if (playing()) {
      controls.invalidate()
      current.stop()
      setPlaying(false)
      setStatus('정지했습니다.')
      return
    }
    try {
      await play(position())
    } catch (cause) {
      setPlaying(false)
      setStatus(getExceptionMessage(cause, '재생하지 못했습니다.'))
    }
  }

  onCleanup(() => close(true))

  return (
    <CrossfadeAudioView
      connection={displayedConnection()}
      duration={duration()}
      onPreview={previewPosition}
      onSeek={seek}
      onToggle={togglePlayback}
      playing={playing()}
      position={position()}
      status={status()}
    />
  )
}

interface CrossfadeAudioViewProps {
  readonly connection: string
  readonly duration: number
  readonly onPreview: (seconds: number) => void
  readonly onSeek: () => Promise<void>
  readonly onToggle: () => Promise<void>
  readonly playing: boolean
  readonly position: number
  readonly status: string
}

function CrossfadeAudioView(props: CrossfadeAudioViewProps) {
  return (
    <div class="grid gap-3 rounded-xl border border-white/15 p-4">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="min-h-11 rounded-xl border border-white/20 bg-transparent px-4 text-#f8edf1"
          disabled={props.duration <= 0}
          onClick={() => props.onToggle()}
          type="button"
        >
          {props.playing ? '일시정지' : '재생'}
        </button>
        <span class="text-sm text-#bdb2c4">
          {props.position.toFixed(1)} / {props.duration.toFixed(1)}초 · {props.connection}초 연결
        </span>
      </div>
      <input
        aria-label="크로스페이드 오디오 위치"
        class="min-h-11 w-full accent-#b8e8d0"
        disabled={props.duration <= 0}
        max={props.duration}
        min="0"
        onInput={(event) => props.onPreview(event.currentTarget.valueAsNumber)}
        onChange={() => props.onSeek()}
        step="0.1"
        type="range"
        value={props.position}
      />
      <p class="m-0 text-sm text-#bdb2c4" role="status">
        {props.status}
      </p>
    </div>
  )
}
