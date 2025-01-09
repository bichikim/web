import {Meta, Title} from '@solidjs/meta'
import {createEffect, createMemo, createSignal, untrack} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SettingData, SHiddenPlayer} from 'src/components/midi-player'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {createSplendidGrandPiano} from 'src/use/instruments'
import {useStorage} from '@winter-love/solid-use'
import {SScale} from 'src/components/scale'
import {HUNDRED} from '@winter-love/utils'
import {useDetectMinScale} from 'src/use/detect-min-size'
import {useCookie} from 'src/use/cookie'

export interface HomePageProps {
  initMusics?: MusicInfo[]
  presetTitle?: string
}
const pianoSize = 7520

export default function HomePage(props: HomePageProps) {
  const [pianoElement, setPianoElement] = createSignal<HTMLElement | null>(null)
  const minPianoSize = useDetectMinScale(pianoElement, pianoSize)
  const [splendidGrandPiano, splendidGrandPianoController] = createSplendidGrandPiano({
    onEmitInstrument: emitAllIds,
  })
  const [settingData, setSettingData] = useCookie('coong__piano-setting', {
    keepPlayList: true,
    pianoSize: 100,
  })
  const initMusics = untrack(() => props.initMusics)
  const [musics, setMusics, updateActive] = useStorage<MusicInfo[]>(
    'local',
    'coong:piano-musics-default',
    [],
    {
      enforceValue: initMusics,
      mounted: true,
    },
  )
  const isLoadDone = createMemo(() => splendidGrandPiano().loaded)
  const pageName = 'Piano'
  const handleSettingDataChange = (data: SettingData) => {
    setSettingData((prev) => ({...prev, ...data}))
  }
  const handleMusicsChange = (musics: MusicInfo[]) => {
    setMusics(musics)
  }

  createEffect(() => {
    updateActive(Boolean(settingData().keepPlayList))
  })

  return (
    <>
      <Title>
        Coong - {pageName}
        {props.presetTitle ? ` - ${props.presetTitle}` : ''}
      </Title>
      <Meta property="og:site_name" content={pageName} />
      <Meta property="og:title" content={pageName} />
      <Meta property="og:description" content="Your instruments for free" />
      <main class="relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto inline-block">
        <SScale
          class="h-full w-max origin-top-left"
          size={settingData().pianoSize / HUNDRED}
        >
          <SPiano
            ref={setPianoElement}
            onDown={splendidGrandPianoController.down}
            onUp={splendidGrandPianoController.up}
          />
        </SScale>
      </main>
      <SHiddenPlayer
        pianoMinScale={minPianoSize()}
        settingData={settingData()}
        component="aside"
        initMusics={musics()}
        pianoController={splendidGrandPianoController}
        pianoState={splendidGrandPiano()}
        leftTime={splendidGrandPiano().leftTime}
        onSettingDataChange={handleSettingDataChange}
        onMusicsChange={handleMusicsChange}
        class="absolute bottom-0 right-0 max-w-100vw"
      />
      <span class="select-none fixed left-0 bottom-0 px-4px">
        {' '}
        {isLoadDone() ? '' : 'Please wait files loading ...'}
      </span>
    </>
  )
}
