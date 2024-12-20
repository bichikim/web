import {createEffect, createMemo, createSignal} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SHiddenPlayer} from 'src/components/midi-player'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {SampleStart} from 'src/components/midi-player/types'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {createSplendidGrandPiano} from 'src/use/instruments'

export default function HomePage() {
  const [leftTime, setLeftTime] = createSignal(0)
  let _currentTargetId = ''
  const velocityPercent = 100
  const playStartedAtKey = Symbol('play-started-at')
  const targetIdKey = Symbol('play-started-at')
  const userPlayFlagKey = Symbol('user-play')
  const splendidGrandPiano = createSplendidGrandPiano({
    onEnded: (payload) => {
      if (payload[userPlayFlagKey]) {
        return
      }
      const id = payload.stopId
      if (id === undefined) {
        return
      }
      emitAllIds(new Set([String(id)]), false, true)
      const piano = splendidGrandPiano()
      if (!piano || _currentTargetId !== payload[targetIdKey]) {
        return
      }
      setLeftTime(
        (payload.time ?? 0) -
          ((payload as any)[playStartedAtKey] ?? 0) +
          (payload.duration ?? 0),
      )
    },
    onStart: (payload) => {
      if (payload[userPlayFlagKey]) {
        return
      }
      const id = payload.stopId
      if (id === undefined) {
        return
      }
      emitAllIds(new Set([String(id)]), true, true)
    },
  })

  const handleDown = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.start({
      note: key,
      [userPlayFlagKey]: true,
    } as any)
  }

  const handleUp = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.stop(key)
  }

  const handleMountSample = (payload: SampleStart, targetId: string) => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    _currentTargetId = targetId
    setLeftTime(0)
    piano.start({
      ...payload,
      [playStartedAtKey]: piano.context.currentTime,
      [targetIdKey]: targetId,
      time: (payload.time ?? 0) + piano.context.currentTime,
      velocity: (payload.velocity ?? 1) * velocityPercent,
    } as any)
  }

  const handleStop = async () => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    // await piano.context.suspend()
    piano.stop()
  }

  const handleResume = () => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    return piano.context.resume()
  }

  const handleSuspend = () => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    return piano.context.suspend()
  }

  const isLoadDone = createMemo(() => Boolean(splendidGrandPiano()))

  return (
    <>
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto">
        <div class="h-full w-max">
          <SPiano onDown={handleDown} onUp={handleUp} />
        </div>
      </main>
      <div class="absolute bottom-0 right-0">
        <SHiddenPlayer
          onResume={handleResume}
          onStop={handleStop}
          onMountSample={handleMountSample}
          onSuspend={handleSuspend}
          leftTime={leftTime()}
        />
      </div>
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isLoadDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
