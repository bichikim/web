import {
  RouteSectionProps,
  useLocation,
  useNavigate,
  useSearchParams,
} from '@solidjs/router'
import {useStorage} from '@winter-love/solid-use'
import {createMemo, createResource} from 'solid-js'
import {
  LinkType,
  MusicInfo,
  SettingContext,
  SettingData,
  SHiddenPlayer,
} from 'src/components/midi-player'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {useCookie} from 'src/use/cookie'
import {createSplendidGrandPiano, SplendidGrandPianoContext} from 'src/use/instruments'
import {getStorageKey} from 'src/utils/storage-key'
import {getSelfUrl} from 'src/env'
import {Analytics} from 'src/components/vercel'

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

const layoutStyle = `:uno:
absolute overflow-hidden top-0 left-0 bottom-0 right-0 before:content-[""] before:absolute before:top-0
before:bottom-0 before:left-0 before:right-0 before:pattern-a before:pointer-events-none
`

export default function MainLayout(props: RouteSectionProps) {
  const [splendidGrandPiano, splendidGrandPianoController] = createSplendidGrandPiano({
    onEmitInstrument: emitAllIds,
  })
  const [searchParams] = useSearchParams<{preset?: string}>()
  const [preset] = createResource(() => getPreset(searchParams.preset))
  const location = useLocation()
  const navigate = useNavigate()

  const [settingData, setSettingData] = useCookie<SettingData>(
    getStorageKey('piano-setting'),
    {
      keepPlayList: true,
      pianoSize: 100,
      showKeyName: false,
    },
  )
  const isActiveStore = createMemo(() => Boolean(settingData().keepPlayList))

  const linkType = createMemo(() => {
    return location.pathname === '/' ? 'music' : 'piano'
  })

  const [musics, setMusics] = useStorage<MusicInfo[]>(
    'local',
    getStorageKey('piano-musics-default'),
    {
      active: isActiveStore,
      enforceValue: preset()?.musics,
      initValue: [],
      mounted: true,
    },
  )

  const handleSettingDataChange = (data: SettingData) => {
    setSettingData((prev) => ({...prev, ...data}))
  }

  const handleMusicsChange = (musics: MusicInfo[]) => {
    setMusics(musics)
  }

  const handleLinkTypeChange = (linkType: LinkType) => {
    navigate(linkType === 'piano' ? '/' : '/music')
  }

  return (
    <>
      <SettingContext.Provider value={settingData}>
        <SplendidGrandPianoContext.Provider
          value={[splendidGrandPiano, splendidGrandPianoController]}
        >
          <div id="layout" class={layoutStyle}>
            {props.children}
            <SHiddenPlayer
              linkType={linkType()}
              settingData={settingData()}
              initMusics={musics()}
              pianoController={splendidGrandPianoController}
              playState={splendidGrandPiano()}
              onSettingDataChange={handleSettingDataChange}
              onMusicsChange={handleMusicsChange}
              onLink={handleLinkTypeChange}
              class="absolute bottom-1 right-1"
            />
          </div>
        </SplendidGrandPianoContext.Provider>
      </SettingContext.Provider>
      <Analytics />
    </>
  )
}
