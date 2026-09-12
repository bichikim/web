import {Title} from '@solidjs/meta'
import {Show} from 'solid-js'
import {useAdminMusic} from '../features/admin-music'
import {AlbumWorkspace} from './admin-music/AlbumWorkspace'
import {AdminMusicHeader} from './admin-music/Header'
import {AlbumDraftForm} from './admin-music/AlbumDraftForm'
import {AlbumNavigation} from './admin-music/AlbumNavigation'

export const AdminMusic = () => {
  const model = useAdminMusic()

  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>음악 / 앨범 관리 · 앱</Title>
      <AdminMusicHeader model={model} />

      <Show when={model.catalogRefreshMessage()}>
        {(refreshMessage) => (
          <div
            role="status"
            class="mx-auto mt-6 w-full max-w-6xl rounded-3 bg-white/7 px-4 py-3 text-sm"
          >
            <p>{refreshMessage()}</p>
            <button
              type="button"
              class="mt-3 rounded-2 bg-white/10 px-3 py-2 disabled:opacity-50"
              disabled={model.isRefreshingCatalog()}
              onClick={model.handleCatalogRetry}
            >
              {model.isRefreshingCatalog() ? '목록 갱신 중…' : '목록 새로고침'}
            </button>
          </div>
        )}
      </Show>

      <Show when={model.message()}>
        {(currentMessage) => (
          <p class="mx-auto mt-6 w-full max-w-6xl rounded-3 bg-white/7 px-4 py-3 text-sm">
            {currentMessage()}
          </p>
        )}
      </Show>

      <Show
        when={
          model.isAlbumEditorOpen() || (!model.isLoading() && model.catalog().albums.length === 0)
        }
      >
        <section aria-label="새 앨범 만들기" class="mx-auto mt-8 w-full max-w-6xl">
          <AlbumDraftForm model={model} />
        </section>
      </Show>

      <Show when={model.isLoading()}>
        <p class="mx-auto mt-8 w-full max-w-6xl text-sm text-white/50">목록을 불러오는 중…</p>
      </Show>

      <Show when={!model.isLoading() && model.catalog().albums.length > 0}>
        <section class="mx-auto mt-8 grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <AlbumNavigation
            albums={model.catalog().albums}
            onAlbumSelect={model.setSelectedAlbumId}
            selectedAlbumId={model.selectedAlbumId()}
            trackCount={model.getTrackCount}
          />
          <Show keyed when={model.selectedAlbumId()}>
            {(selectedAlbumId) => (
              <Show when={model.catalog().albums.find((album) => album.id === selectedAlbumId)}>
                {(album) => <AlbumWorkspace album={album()} model={model} />}
              </Show>
            )}
          </Show>
        </section>
      </Show>
    </main>
  )
}
