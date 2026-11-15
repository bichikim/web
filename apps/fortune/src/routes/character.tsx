import {clientOnly} from '@solidjs/start'
import {SPageMetadata} from '../components/metadata/SPageMetadata'

const CharacterViewer = clientOnly(() => import('../components/character-viewer/SCharacterViewer'))

export default function Character() {
  return (
    <>
      <SPageMetadata title="캐릭터" path="/character" />
      <CharacterViewer
        fallback={
          <main
            class="grid h-dvh place-items-center bg-[#24212b] text-sm text-[#f6f2fa]"
            role="status"
          >
            캐릭터 불러오는 중…
          </main>
        }
      />
    </>
  )
}
