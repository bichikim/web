import {createSignal, Show} from 'solid-js'
import {AlbumDraftForm} from '../../../../../src/components/admin-music/AlbumDraftForm'
import {AlbumNavigation} from '../../../../../src/components/admin-music/AlbumNavigation'
import {type AdminAlbum, useAlbumDraft} from '../../../../../src/features/admin-music'

const album: AdminAlbum = {
  coverFallback: 'cd',
  coverImageUrl: '/test/unavailable-cover.webp',
  id: 'album-fixture',
  release: {blockers: [], ready: true},
  status: 'draft',
  translations: [
    {albumId: 'album-fixture', description: '', locale: 'ko', title: '등록된 앨범 이름'},
  ],
}

export default function AlbumCovers() {
  const [message, setMessage] = createSignal<string | null>(null)
  const draft = useAlbumDraft({refreshCatalog: async () => undefined, setMessage})

  return (
    <main>
      <AlbumDraftForm model={draft} />
      <Show when={message()}>{(text) => <p role="status">{text()}</p>}</Show>
      <AlbumNavigation
        albums={[album]}
        onAlbumSelect={() => undefined}
        selectedAlbumId={album.id}
        trackCount={() => 0}
      />
    </main>
  )
}
