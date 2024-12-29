import {Meta, Title} from '@solidjs/meta'
import {createMemo} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SettingData, SHiddenPlayer} from 'src/components/midi-player'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {createSplendidGrandPiano} from 'src/use/instruments'
import {useStorage} from '@winter-love/solid-use'

export interface HomePageProps {
  musics?: MusicInfo[]
  presetTitle?: string
}

export default function HomePage(props: HomePageProps) {
  const [splendidGrandPiano, splendidGrandPianoController] = createSplendidGrandPiano({
    onEmitInstrument: emitAllIds,
  })

  const [settingData, setSettingData] = useStorage('local', 'coong:piano-setting', {
    keepPlayList: true,
    pianoSize: 100,
  })

  const isLoadDone = createMemo(() => splendidGrandPiano().loaded)
  const pageName = 'Piano'

  const handleSettingData = (data: SettingData) => {
    setSettingData((prev) => ({...prev, ...data}))
  }

  return (
    <>
      <Title>
        Coong - {pageName}
        {props.musics ? ` - ${props.presetTitle}` : ''}
      </Title>
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
        settingData={settingData()}
        onSettingData={handleSettingData}
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
