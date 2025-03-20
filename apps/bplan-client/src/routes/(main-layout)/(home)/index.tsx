import {Meta, Title} from '@solidjs/meta'
import {createEffect, createMemo, createSignal, onMount, useContext} from 'solid-js'
import {SPiano} from 'src/components/instruments'
import {SettingContext} from 'src/components/midi-player'
import {SplendidGrandPianoContext} from 'src/use/instruments'
import {useStorage} from '@winter-love/solid-use'
import {SScale} from 'src/components/scale'
import {HUNDRED} from '@winter-love/utils'
import {getStorageKey} from 'src/utils/storage-key'
import {ToastContext} from '@winter-love/solid-components'
import {useLocation} from '@solidjs/router'
import ogImage from './og-image.png'

export interface HomePageProps {
  presetTitle?: string
}

export default function HomePage() {
  const [splendidGrandPiano, splendidGrandPianoController] = useContext(
    SplendidGrandPianoContext,
  )
  const [mainElement, setMainElement] = createSignal<HTMLElement | null>(null)

  /**
   * left percent of main element
   */
  const [savedMainScrollLeft, setSavedMainScrollLeft] = useStorage<number | null>(
    'local',
    getStorageKey('piano-scroll-left'),
    {
      initValue: null,
    },
  )
  const settingData = useContext(SettingContext)
  const isLoaded = createMemo(() => splendidGrandPiano().loaded)
  const pageName = 'Piano'
  const {setMessage} = useContext(ToastContext)
  const location = useLocation()

  onMount(() => {
    const element = mainElement()
    let savedScrollLeft = savedMainScrollLeft()

    if (Number.isNaN(savedScrollLeft)) {
      savedScrollLeft = null
    }

    if (element) {
      element.scrollLeft =
        typeof savedScrollLeft === 'number'
          ? (element.scrollWidth - element.clientWidth) * savedScrollLeft
          : (element.scrollWidth - element.clientWidth) / 2
    }
  })

  const handleScroll = (event: Event) => {
    const element = event.target as HTMLElement
    const {scrollLeft} = element
    const scrollLeftPercent = scrollLeft / (element.scrollWidth - element.clientWidth)

    setSavedMainScrollLeft(scrollLeftPercent)
  }

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

  return (
    <>
      <Title>Coong - {pageName}</Title>
      <Meta property="og:site_name" content={pageName} />
      <Meta property="og:title" content={pageName} />
      <Meta
        property="og:description"
        content="Play the piano or enjoy AI-powered piano performances"
      />
      <Meta property="og:url" content={location.pathname} />
      <Meta property="og:image" content={ogImage} />
      <main
        class=":uno: relative h-full overflow-y-hidden pt-0 px-2 flex flex-col overflow-x-auto inline-block"
        ref={setMainElement}
        on:scroll={{handleEvent: handleScroll, passive: true}}
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
