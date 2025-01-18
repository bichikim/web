import {Meta, Title} from '@solidjs/meta'
import {createMemo, useContext} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SettingContext} from 'src/components/midi-player'
import {SplendidGrandPianoContext} from 'src/use/instruments'
import {SScale} from 'src/components/scale'
import {HUNDRED} from '@winter-love/utils'

export interface HomePageProps {
  presetTitle?: string
}

export default function HomePage() {
  const [splendidGrandPiano, splendidGrandPianoController] = useContext(
    SplendidGrandPianoContext,
  )
  const settingData = useContext(SettingContext)
  const isLoadDone = createMemo(() => splendidGrandPiano().loaded)
  const pageName = 'Piano'

  return (
    <>
      <Title>Coong - {pageName}</Title>
      <Meta property="og:site_name" content={pageName} />
      <Meta property="og:title" content={pageName} />
      <Meta property="og:description" content="Your instruments for free" />
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto inline-block">
        <SScale
          class="h-full w-max origin-top-left"
          size={settingData().pianoSize ?? HUNDRED}
        >
          <SPiano
            onDown={splendidGrandPianoController.down}
            onUp={splendidGrandPianoController.up}
            showKeyName={settingData().showKeyName}
          />
        </SScale>
      </main>
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isLoadDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
