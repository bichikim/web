import {clientOnly} from '@solidjs/start'
import {createSignal, For, Show} from 'solid-js'
import {
  type AdminAlbum,
  type AdminAsset,
  type AdminPendingTrack,
  type AdminTrack,
} from '../../../features/admin-music'
import {BUTTON_CLASSES, DANGER_BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES} from '../button-classes'
import {PendingTrackList} from '../PendingTrackList'
import {type AlbumTaskFormProps} from './form-props'
import {TrackForm} from './TrackForm'

const AdminTrackPreview = clientOnly(
  async () => {
    const {AdminTrackPreview} = await import('../AdminTrackPreview')
    return {default: AdminTrackPreview}
  },
  {lazy: true},
)

interface TrackPanelProps extends AlbumTaskFormProps {
  readonly albumStatus: AdminAlbum['status']
  readonly assets: ReadonlyArray<AdminAsset>
  readonly pendingTracks: ReadonlyArray<AdminPendingTrack>
  readonly tracks: ReadonlyArray<AdminTrack>
}

export const TrackPanel = (props: TrackPanelProps) => {
  const [isFormOpen, setIsFormOpen] = createSignal(false)
  const [playingTrackId, setPlayingTrackId] = createSignal<string | null>(null)
  const [requestedTrackId, setRequestedTrackId] = createSignal<string | null>(null)
  const activeTrackIds = () =>
    new Set(props.assets.filter((asset) => asset.status === 'active').map((asset) => asset.trackId))
  const playableTracks = () =>
    props.tracks
      .filter((track) => activeTrackIds().has(track.id))
      .toSorted((leftTrack, rightTrack) => leftTrack.position - rightTrack.position)
  const handleTrackRemove = async (
    event: MouseEvent & {currentTarget: HTMLButtonElement},
    track: AdminTrack,
  ): Promise<void> => {
    const publishedNotice =
      props.albumStatus === 'published' ? '현재 공개 중인 앨범에서도 즉시 사라지며, ' : ''
    const confirmed = event.currentTarget.ownerDocument.defaultView?.confirm(
      `‘${track.title}’을 삭제할까요?\n${publishedNotice}R2의 MP3 파일도 영구 삭제됩니다.`,
    )

    if (confirmed === true) {
      await props.model.handleTrackRemove(track.id)
    }
  }
  return (
    <div class="p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="m-0 text-lg font-800">수록곡 {playableTracks().length}</h3>
          <p class="mb-0 mt-1 text-sm leading-6 text-white/50">
            활성화된 곡만 수록곡 수에 포함됩니다. 확인이 필요한 등록은 별도로 표시됩니다.
          </p>
        </div>
        <button
          class={isFormOpen() ? SECONDARY_BUTTON_CLASSES : BUTTON_CLASSES}
          onClick={() => setIsFormOpen((isOpen) => !isOpen)}
          type="button"
        >
          {isFormOpen() ? '추가 화면 닫기' : '+ 곡 추가'}
        </button>
      </div>

      <Show when={isFormOpen()}>
        <div class="mt-5">
          <TrackForm
            albumId={props.albumId}
            albumTitle={props.albumTitle}
            model={props.model}
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      </Show>

      <Show
        fallback={
          <div class="mt-6 rounded-4 border border-dashed border-white/15 px-5 py-10 text-center">
            <p class="m-0 text-sm font-750 text-white/75">아직 수록곡이 없습니다.</p>
            <p class="mb-0 mt-2 text-xs leading-5 text-white/45">
              곡 없이도 앨범을 공개할 수 있으며, 나중에 언제든 추가할 수 있습니다.
            </p>
            <button
              class={`${BUTTON_CLASSES} mt-5`}
              onClick={() => setIsFormOpen(true)}
              type="button"
            >
              첫 곡 추가
            </button>
          </div>
        }
        when={playableTracks().length > 0 || props.pendingTracks.length > 0}
      >
        <PendingTrackList
          assets={props.assets}
          confirmingAssetId={props.model.confirmingAssetId()}
          isConfirmingAsset={props.model.isConfirmingAsset}
          isRemovingTrack={props.model.isRemovingTrack}
          onConfirm={props.model.handleTrackConfirmation}
          onRemove={props.model.handleTrackRemove}
          pendingTracks={props.pendingTracks}
          removingTrackId={props.model.removingTrackId()}
        />
        <Show when={playableTracks().length > 0}>
          <ol class="mb-0 mt-6 list-none divide-y divide-white/8 p-0">
            <For each={playableTracks()}>
              {(track, index) => (
                <li class="grid gap-x-4 gap-y-3 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
                  <span class="pt-2 text-center text-xs font-700 tabular-nums text-white/35">
                    {String(index() + 1).padStart(2, '0')}
                  </span>
                  <span class="min-w-0 pt-1">
                    <span class="block truncate text-sm font-750 text-white/90">{track.title}</span>
                    <span class="mt-1 block truncate text-xs text-white/45">{track.artist}</span>
                  </span>
                  <button
                    aria-label={`${track.title} 수록곡 삭제`}
                    class={`${DANGER_BUTTON_CLASSES} justify-self-end`}
                    disabled={props.model.isRemovingTrack(track.id)}
                    onClick={async (event) => handleTrackRemove(event, track)}
                    type="button"
                  >
                    {props.model.isRemovingTrack(track.id) ? '삭제 중…' : '삭제'}
                  </button>
                  <div class="min-w-0 sm:col-start-2 sm:col-end-4">
                    <AdminTrackPreview
                      active={playingTrackId() === track.id}
                      autoplay={requestedTrackId() === track.id}
                      fallback={
                        <div class="h-10 animate-pulse rounded-3 bg-white/5" aria-hidden="true" />
                      }
                      onPlay={() => setPlayingTrackId(track.id)}
                      onRequest={() => setRequestedTrackId(track.id)}
                      title={track.title}
                      trackId={track.id}
                    />
                  </div>
                </li>
              )}
            </For>
          </ol>
        </Show>
      </Show>
    </div>
  )
}
