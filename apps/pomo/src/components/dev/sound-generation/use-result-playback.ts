import {type Accessor, batch, createEffect, createSignal} from 'solid-js'
import {clamp} from 'es-toolkit/math'
import {DEFAULT_CONNECTION_SECONDS} from 'src/features/sound-generation/connection'
import type {CrossfadePlaybackState} from './CrossfadeAudio'

interface UseResultPlaybackProps {
  /** 페이지가 소유한 기본 오디오의 현재 참조를 읽으며 생성·폐기는 페이지가 담당합니다. */
  readonly nativeAudio: Accessor<HTMLAudioElement | undefined>
  /** 상태를 넘길 때 현재 생성 결과가 남아 있는지 확인합니다. */
  readonly resultUrl: Accessor<string | null>
}

interface NativeHandoffInput {
  /** 연결 구간 기능의 현재 사용 여부입니다. */
  readonly connectionEnabled: boolean
  /** 입력 변경 전 연결 구간 값이며 빈 입력은 NaN입니다. */
  readonly connectionSeconds: number
  /** 아직 소비하지 않은 전환 상태이며, 있으면 그대로 보존합니다. */
  readonly handoff: CrossfadePlaybackState | null
  /** 페이지가 소유한 기본 오디오의 비소유 참조이며 없으면 읽지 않습니다. */
  readonly nativeAudio: HTMLAudioElement | undefined
  /** 반복 재생의 현재 사용 여부입니다. */
  readonly repeat: boolean
  /** 이번 입력으로 적용할 연결 구간 값입니다. */
  readonly seconds: number
}

const readNativeHandoff = (input: NativeHandoffInput): CrossfadePlaybackState | null => {
  if (
    !input.repeat ||
    !input.connectionEnabled ||
    input.connectionSeconds > 0 ||
    !(input.seconds > 0) ||
    input.handoff !== null ||
    input.nativeAudio === undefined
  ) {
    return null
  }
  return {playing: !input.nativeAudio.paused, position: input.nativeAudio.currentTime}
}

export function useResultPlayback(props: UseResultPlaybackProps) {
  const [repeat, setRepeat] = createSignal(false)
  const [connectionEnabled, setConnectionEnabled] = createSignal(true)
  const [connectionSeconds, setConnectionSeconds] = createSignal(DEFAULT_CONNECTION_SECONDS)
  const [handoff, setHandoff] = createSignal<CrossfadePlaybackState | null>(null)

  const applyNativeHandoff = () => {
    const element = props.nativeAudio()
    const state = handoff()
    if (element === undefined || state === null) {
      return
    }
    if (element.readyState < 1 || !Number.isFinite(element.duration)) {
      return
    }
    element.currentTime = clamp(state.position, 0, element.duration)
    if (state.playing) {
      Promise.resolve(element.play()).catch(() => undefined)
    }
    setHandoff(null)
  }
  createEffect(() => {
    if (!repeat() || !connectionEnabled() || !(connectionSeconds() > 0)) {
      handoff()
      applyNativeHandoff()
    }
  })
  const handleConnectionEnabledChange = (enabled: boolean) => {
    const nativeAudio = props.nativeAudio()
    if (enabled && repeat() && nativeAudio !== undefined) {
      const state = handoff() ?? {playing: !nativeAudio.paused, position: nativeAudio.currentTime}
      batch(() => {
        setConnectionEnabled(true)
        setHandoff(state)
      })
      return
    }
    setConnectionEnabled(enabled)
  }
  const handleRepeatChange = (enabled: boolean) => {
    const nativeAudio = props.nativeAudio()
    if (enabled && nativeAudio !== undefined) {
      const state = handoff() ?? {
        playing: !nativeAudio.paused,
        position: nativeAudio.currentTime,
      }
      batch(() => {
        setHandoff(state)
        setRepeat(enabled)
      })
      return
    }
    setRepeat(enabled)
  }
  const handleHandoffChange = (state: CrossfadePlaybackState) => {
    if (props.resultUrl() !== null) {
      setHandoff(state)
    }
  }
  const handleConnectionSecondsChange = (seconds: number) => {
    const state = readNativeHandoff({
      connectionEnabled: connectionEnabled(),
      connectionSeconds: connectionSeconds(),
      handoff: handoff(),
      nativeAudio: props.nativeAudio(),
      repeat: repeat(),
      seconds,
    })
    batch(() => {
      setHandoff(state ?? handoff())
      setConnectionSeconds(seconds)
    })
  }
  return {
    applyNativeHandoff,
    connectionEnabled,
    connectionSeconds,
    handleConnectionEnabledChange,
    handleConnectionSecondsChange,
    handleHandoffChange,
    handleRepeatChange,
    handoff,
    repeat,
    resetResult: () => setHandoff(null),
  }
}
