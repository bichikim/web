import {createMemo} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {createSplendidGrandPiano} from 'src/use/instruments'
import {HPlayer} from 'src/components/midi-player'

export default function HomePage() {
  const splendidGrandPiano = createSplendidGrandPiano({
    onStart: (payload) => {
      console.log('splendid-grand-piano started', payload)
    },
  })

  const onDown = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.start(key)
  }

  const onUp = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.stop(key)
  }

  const onTestPlay = () => {
    console.log('???')
    const piano = splendidGrandPiano()
    if (piano) {
      console.log(piano.context.currentTime)
    }
    piano?.start({
      duration: 0.5807291666666666,
      note: 'G5',
      time: 0.5924479166666666 + piano.context.currentTime,
      velocity: 0.6062992125984252 * 100,
    })
    piano?.start({
      duration: 0.29036458333333326,
      note: 'F5',
      time: 0.8828125 + piano.context.currentTime,
      velocity: 0.6062992125984252 * 100,
    })
  }

  const isDone = createMemo(() => Boolean(splendidGrandPiano()))

  return (
    <>
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto">
        <div class="h-full w-max">
          <SPiano onDown={onDown} onUp={onUp} />
        </div>
      </main>
      <div class="absolute bottom-0 right-0">
        <HPlayer />
      </div>
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
