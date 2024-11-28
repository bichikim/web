import {createMemo} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {createSplendidGrandPiano} from 'src/use/instruments'

export default function HomePage() {
  const splendidGrandPiano = createSplendidGrandPiano()

  const onDown = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.start(key)
  }

  const onUp = (key: string | number) => {
    const piano = splendidGrandPiano()
    piano?.stop(key)
  }

  const isDone = createMemo(() => Boolean(splendidGrandPiano()))

  return (
    <>
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto">
        <div class="h-full w-max">
          <SPiano onDown={onDown} onUp={onUp} />
        </div>
      </main>
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
