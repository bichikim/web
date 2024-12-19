import {createMemo} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SHiddenPlayer} from 'src/components/midi-player'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {createSplendidGrandPiano} from 'src/use/instruments'

export default function HomePage() {
  let _targetId = ''
  const velocityPercent = 100
  const userPlayFlag = Symbol('user-play')
  const splendidGrandPiano = createSplendidGrandPiano({
    onEnded: (payload) => {
      if (payload[userPlayFlag]) {
        return
      }
      const id = payload.stopId
      if (id === undefined) {
        return
      }
      emitAllIds(new Set([String(id)]), false, true)
    },
    onStart: (payload) => {
      if (payload[userPlayFlag]) {
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
      [userPlayFlag]: true,
    } as any)
  }

  const handleUp = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.stop(key)
  }

  const handlePlay = async (payload: MusicInfo, targetId: string) => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    const oldTargetId = _targetId
    _targetId = targetId
    if (piano.context.state === 'suspended' && oldTargetId === targetId) {
      return piano.context.resume()
    }
    piano.stop()
    await piano.context.resume()
    const {midi} = payload

    if (!midi) {
      return
    }

    for (const notes of midi) {
      for (const note of notes) {
        piano.start({
          ...note,
          time: (note.time ?? 0) + piano.context.currentTime,
          velocity: (note.velocity ?? 1) * velocityPercent,
        })
      }
    }
  }

  const handlePause = () => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    return piano.context.suspend()
  }

  const handleStop = async () => {
    const piano = splendidGrandPiano()
    if (!piano) {
      return
    }
    // await piano.context.suspend()
    piano.stop()
    _targetId = ''
  }

  const isDone = createMemo(() => Boolean(splendidGrandPiano()))

  return (
    <>
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto">
        <div class="h-full w-max">
          <SPiano onDown={handleDown} onUp={handleUp} />
        </div>
      </main>
      <div class="absolute bottom-0 right-0">
        <SHiddenPlayer onPlay={handlePlay} onPause={handlePause} onStop={handleStop} />
      </div>
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
