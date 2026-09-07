import {Tabs} from '@kobalte/core/tabs'
import {cx} from 'class-variance-authority'
import {createSignal, For, Show} from 'solid-js'
import {
  type AdminAlbum,
  type AdminMusicModel,
  getAlbumTranslation,
} from '../../features/admin-music'
import {AlbumReleaseCard} from './AlbumReleaseCard'
import {AlbumDetailsPanel} from './workspace/AlbumDetailsPanel'
import {TrackPanel} from './workspace/TrackPanel'
import {SalesPanel} from './workspace/SalesPanel'

const TAB_CLASSES = cx(
  'min-h-11 whitespace-nowrap border-b-2 px-1 text-sm font-750 transition',
  'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-#e8bc88',
)

const WORKSPACE_TABS = [
  {id: 'details', label: '기본 정보'},
  {id: 'tracks', label: '수록곡'},
  {id: 'sales', label: '판매 및 공개'},
] as const

type WorkspaceTab = (typeof WORKSPACE_TABS)[number]['id']

export interface AlbumWorkspaceProps {
  readonly album: AdminAlbum
  readonly model: AdminMusicModel
}

export const AlbumWorkspace = (props: AlbumWorkspaceProps) => {
  const [activeTab, setActiveTab] = createSignal<WorkspaceTab>('tracks')
  const [isStatusReviewOpen, setIsStatusReviewOpen] = createSignal(false)
  const albumTracks = () =>
    props.model.catalog().tracks.filter((track) => track.albumId === props.album.id)
  const pendingTracks = () =>
    props.model.catalog().pendingTracks.filter((track) => track.albumId === props.album.id)
  const trackIds = () => new Set([...albumTracks(), ...pendingTracks()].map((track) => track.id))
  const albumAssets = () =>
    props.model.catalog().assets.filter((asset) => trackIds().has(asset.trackId))
  const albumOffers = () =>
    props.model.catalog().offers.filter((offer) => offer.albumId === props.album.id)
  const albumTitle = () => getAlbumTranslation(props.album, 'ko')?.title ?? '제목 없음'
  const activeTrackCount = () => {
    const activeTrackIds = new Set(
      albumAssets()
        .filter((asset) => asset.status === 'active')
        .map((asset) => asset.trackId),
    )

    return albumTracks().filter((track) => activeTrackIds.has(track.id)).length
  }
  const activeOfferCount = () =>
    albumOffers().filter(
      (offer) =>
        offer.billingType === 'one_time' &&
        offer.productStatus === 'active' &&
        offer.status === 'active',
    ).length
  const handlePublicSettingsSelect = () => {
    setActiveTab('sales')
    setIsStatusReviewOpen(true)
  }
  return (
    <Tabs
      class="grid gap-4"
      onChange={(value) => {
        setActiveTab(value as WorkspaceTab)
        setIsStatusReviewOpen(false)
      }}
      value={activeTab()}
    >
      <AlbumReleaseCard
        activeOfferCount={activeOfferCount()}
        album={props.album}
        onPublicSettingsSelect={handlePublicSettingsSelect}
        trackCount={activeTrackCount()}
      />
      <div class="overflow-hidden rounded-5 border border-white/10 bg-white/3">
        <Tabs.List
          aria-label="앨범 관리 영역"
          class="flex gap-6 overflow-x-auto border-b border-white/10 px-5"
        >
          <For each={WORKSPACE_TABS}>
            {(tab) => (
              <Tabs.Trigger
                class={cx(
                  TAB_CLASSES,
                  activeTab() === tab.id
                    ? 'border-#e8bc88 text-white'
                    : 'border-transparent text-white/45 hover:text-white/75',
                )}
                value={tab.id}
              >
                {tab.label}
                <Show when={tab.id === 'tracks'}> {activeTrackCount()}</Show>
              </Tabs.Trigger>
            )}
          </For>
        </Tabs.List>
        <Tabs.Content value="details">
          <AlbumDetailsPanel album={props.album} />
        </Tabs.Content>
        <Tabs.Content value="tracks">
          <TrackPanel
            albumId={props.album.id}
            albumStatus={props.album.status}
            albumTitle={albumTitle()}
            assets={albumAssets()}
            model={props.model}
            pendingTracks={pendingTracks()}
            tracks={albumTracks()}
          />
        </Tabs.Content>
        <Tabs.Content value="sales">
          <SalesPanel
            album={props.album}
            albumId={props.album.id}
            albumTitle={albumTitle()}
            isStatusReviewOpen={isStatusReviewOpen()}
            model={props.model}
            offers={albumOffers()}
            onStatusReviewClose={() => setIsStatusReviewOpen(false)}
            onStatusReviewOpen={() => setIsStatusReviewOpen(true)}
            trackCount={activeTrackCount()}
          />
        </Tabs.Content>
      </div>
    </Tabs>
  )
}
