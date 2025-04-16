import {cva, cx} from 'class-variance-authority'
import {SAuroraText} from 'src/components/text'
import {createSignal, useContext} from 'solid-js'
import {MidiPlayerContext} from 'src/components/midi-player/context'
import {PageMeta} from 'src/components/page-meta'

const linkStyle = cx(
  'cursor-pointer text-6 flex items-center text-black mt-5 underline',
  'text-center',
)

const getSample = async () => {
  const response = await fetch('/api/preset/hidden-teenieping')

  return response.json()
}

const effectBaseText = `:uno:
text-xl font-bold
var-aurora-color-1=#00c2ff var-aurora-color-2=#33ff8c var-aurora-color-3=#ffc640 var-aurora-color-4=#e54cff
`

const effectTextStyle = cva(effectBaseText, {
  variants: {
    isLoading: {
      false:
        'var-aurora-color-1=#00c2ff var-aurora-color-2=#33ff8c var-aurora-color-3=#ffc640 var-aurora-color-4=#e54cff',
      true: 'text-gray',
    },
  },
})

export default function MusicPage() {
  const [isLoading, setIsLoading] = createSignal(false)
  const {handleAddPlayItem} = useContext(MidiPlayerContext)

  const handleGetSample = async () => {
    setIsLoading(true)
    const {musics} = (await getSample()) ?? {}

    if (musics && musics.length > 0) {
      handleAddPlayItem(musics)
    }

    setIsLoading(false)
  }

  return (
    <>
      <PageMeta
        pageName="MIDI File Market"
        description="Share your MIDI files with others"
      />
      <main class=":uno: flex flex-col items-center justify-center h-full px-2">
        <h1 class=":uno: text-4xl font-bold leading-15 text-center">
          MIDI File Market Page
        </h1>
        <h3 class="text-2xl text-center">Working in progress...</h3>
        <a href="/" class={linkStyle}>
          Go back to piano{' '}
          <span class=":uno: h-6 w-6 inline-block bg-black i-tabler:piano" />
        </a>
        <button
          class="mt-2 flex items-center gap-1"
          onClick={handleGetSample}
          disabled={isLoading()}
        >
          <SAuroraText class={effectTextStyle({isLoading: isLoading()})}>
            Get Sample Midi files
          </SAuroraText>
        </button>
      </main>
    </>
  )
}
