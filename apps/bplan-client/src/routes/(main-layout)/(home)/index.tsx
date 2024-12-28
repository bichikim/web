import {Meta, Title} from '@solidjs/meta'
import {createMemo} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SHiddenPlayer} from 'src/components/midi-player'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {createSplendidGrandPiano} from 'src/use/instruments'

export default function HomePage() {
  const [splendidGrandPiano, splendidGrandPianoController] = createSplendidGrandPiano({
    onEmitInstrument: emitAllIds,
  })

  const isLoadDone = createMemo(() => splendidGrandPiano().loaded)
  const pageName = 'Piano'

  return (
    <>
      <Title>Coong - {pageName}</Title>
      <Meta property="og:site_name" content={pageName} />
      <Meta property="og:title" content={pageName} />
      <Meta property="og:description" content="Your instruments for free" />
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto">
        <div class="h-full w-max">
          <SPiano
            onDown={splendidGrandPianoController.down}
            onUp={splendidGrandPianoController.up}
          />
        </div>
      </main>
      <SHiddenPlayer
        component="aside"
        pianoController={splendidGrandPianoController}
        pianoState={splendidGrandPiano()}
        leftTime={splendidGrandPiano().leftTime}
        class="absolute bottom-0 right-0 max-w-100vw"
      />
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isLoadDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
