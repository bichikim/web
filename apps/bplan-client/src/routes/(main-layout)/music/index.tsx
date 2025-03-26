import {cx} from 'class-variance-authority'
import {SAuroraText} from 'src/components/text'
import {useContext} from 'solid-js'
import {MidiPlayerContext} from 'src/components/midi-player/context'

const linkStyle = cx(
  'cursor-pointer text-6 flex items-center text-black mt-5 underline',
  'text-center',
)

const getSample = async () => {
  const response = await fetch('/api/preset/hidden-teenieping')

  return response.json()
}

const effectText = `:uno:
text-xl font-bold underline
var-aurora-color-1=#00c2ff var-aurora-color-2=#33ff8c var-aurora-color-3=#ffc640 var-aurora-color-4=#e54cff
`

export default function MusicPage() {
  const {handleAddPlayItem} = useContext(MidiPlayerContext)

  const handleGetSample = async () => {
    const {musics} = (await getSample()) ?? {}

    if (musics && musics.length > 0) {
      handleAddPlayItem(musics)
    }
  }

  return (
    <main class=":uno: flex flex-col items-center justify-center h-full px-2">
      <h1 class=":uno: text-4xl font-bold leading-15 text-center">
        MIDI File Market Page
      </h1>
      <h3 class="text-2xl text-center">Working in progress...</h3>
      <a href="/" class={linkStyle}>
        Go back to piano{' '}
        <span class=":uno: h-6 w-6 inline-block bg-black i-tabler:piano" />
      </a>
      <button class="mt-2" onClick={handleGetSample}>
        <SAuroraText class={effectText}>Get Sample Midi files</SAuroraText>
      </button>
    </main>
  )
}
