import {createEffect, createMemo, createSignal, useContext} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SettingContext} from 'src/components/midi-player'
import {SplendidGrandPianoContext} from 'src/use/instruments'
import {SScale} from 'src/components/scale'
import {HUNDRED} from '@winter-love/utils'
import {ToastContext} from '@winter-love/solid-components'
import {useRestoreScroll} from 'src/use/restore-scroll'
import ogImage from './og-image.png'
import {PageMeta} from 'src/components/page-meta'
import {useStorage} from '@winter-love/solid-use'
import {MidiPlayerContext} from 'src/components/midi-player/context'

const getSample = async () => {
  const response = await fetch('/api/preset/hidden-teenieping')

  return response.json()
}

export interface HomePageProps {
  presetTitle?: string
}

export default function HomePage() {
  const pageName = 'Piano'
  const description = 'Play the piano or enjoy AI-powered piano performances'

  const [splendidGrandPiano, splendidGrandPianoController] = useContext(
    SplendidGrandPianoContext,
  )
  const [mainElement, setMainElement] = createSignal<HTMLElement | null>(null)
  const {handleAddPlayItem} = useContext(MidiPlayerContext)
  const [isLoading, setIsLoading] = createSignal(false)

  const [isShowAddMidisMessage, setIsShowAddMidisMessage] = useStorage(
    'session',
    'coong__show-add-midis-message',
    {initValue: true},
  )

  useRestoreScroll(mainElement)

  const settingData = useContext(SettingContext)
  const isLoaded = createMemo(() => splendidGrandPiano().loaded)
  const {setMessage} = useContext(ToastContext)

  const handleGetSample = async () => {
    setIsLoading(true)
    const {musics} = (await getSample()) ?? {}

    if (musics && musics.length > 0) {
      handleAddPlayItem(musics)
    }

    setIsLoading(false)
    setIsShowAddMidisMessage(false)
  }

  // piano loading message to
  createEffect(() => {
    const isPianoLoaded = isLoaded()
    const id = 'piano-loading'
    const message = 'Please wait, Piano files are loading...'

    if (isPianoLoaded) {
      setMessage({
        closeHook: (close) => {
          close()
        },
        id,
        message,
      })
    } else {
      setMessage({
        id,
        message,
      })
    }
  })

  createEffect(() => {
    const _isShowAddMidisMessage = isShowAddMidisMessage()
    const id = 'add-midis-message'
    const message = 'Get Sample Midi files to play music now'

    if (_isShowAddMidisMessage) {
      setMessage({
        actions: [
          {
            action: async ({close}) => {
              await handleGetSample()
              close()
            },
            actionToClose: true,
            label: 'Get Now',
            props: {loading: isLoading(), variant: 'primary'},
            type: 'click',
          },
          {
            action: () => {
              setIsShowAddMidisMessage(false)
            },
            actionToClose: true,
            label: 'Skip',
            props: {flat: true},
            type: 'click',
          },
        ],
        id,
        message,
      })
    }
  })

  return (
    <>
      <PageMeta pageName={pageName} description={description} image={ogImage} />
      <main
        class=":uno: relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto inline-block"
        ref={setMainElement}
      >
        <SScale
          class=":uno: h-full w-max origin-top-left"
          size={settingData().pianoSize ?? HUNDRED}
        >
          <SPiano
            onDown={splendidGrandPianoController.down}
            onUp={splendidGrandPianoController.up}
            showKeyName={settingData().showKeyName}
          />
        </SScale>
      </main>
    </>
  )
}
