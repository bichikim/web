import {RouteSectionProps, useSearchParams} from '@solidjs/router'
import {useStorage} from '@winter-love/solid-use'
import {createEffect, createResource} from 'solid-js'
import {
  MusicInfo,
  SettingContext,
  SettingData,
  SHiddenPlayer,
} from 'src/components/midi-player'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {useCookie} from 'src/use/cookie'
import {createSplendidGrandPiano, SplendidGrandPianoContext} from 'src/use/instruments'

const getSelfUrl = () => {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

interface Data {
  musics: MusicInfo[]
  title: string
}
const getPreset = async (id?: string): Promise<Data | undefined> => {
  'use server'

  if (!id) {
    return
  }

  return fetch(`${getSelfUrl()}/api/preset/${id}`).then((res) => {
    if (res.ok) {
      return res.json()
    }

    return {musics: [], title: 'Unknown'}
  })
}

const layoutCss =
  'absolute overflow-hidden top-0 left-0 bottom-0 right-0 before:content-[""] before:absolute before:top-0 ' +
  'before:bottom-0 before:left-0 before:right-0 before:pattern-a'

export default function MainLayout(props: RouteSectionProps) {
  const [splendidGrandPiano, splendidGrandPianoController] = createSplendidGrandPiano({
    onEmitInstrument: emitAllIds,
  })
  const [searchParams] = useSearchParams<{preset?: string}>()
  const [preset] = createResource(() => getPreset(searchParams.preset))
  const [settingData, setSettingData] = useCookie<SettingData>('coong__piano-setting', {
    keepPlayList: true,
    pianoSize: 100,
    showKeyName: false,
  })
  const [musics, setMusics, updateActive] = useStorage<MusicInfo[]>(
    'local',
    'coong:piano-musics-default',
    [],
    {
      enforceValue: preset()?.musics,
      mounted: true,
    },
  )
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
    <SettingContext.Provider value={settingData}>
      <SplendidGrandPianoContext.Provider
        value={[splendidGrandPiano, splendidGrandPianoController]}
      >
        <div id="layout" class={layoutCss}>
          {props.children}
          <SHiddenPlayer
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
        </div>
      </SplendidGrandPianoContext.Provider>
    </SettingContext.Provider>
  )
}
