import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createSignal, For, type JSX, Match, Show, Switch} from 'solid-js'

import {AlbumReleaseCard} from './AlbumReleaseCard'
import type {AdminMusicModel} from './AdminMusic'
import TrackFields from './TrackFields'
import {
  type AdminAlbum,
  type AdminAsset,
  type AdminOffer,
  type AdminTrack,
  getAlbumTranslation,
} from './catalog'

const AdminTrackPreview = clientOnly(() => import('./AdminTrackPreview'), {lazy: true})

const BUTTON_CLASSES = cx(
  'h-11 rounded-3 border border-#e8bc88/55 bg-#e8bc88 px-5 text-sm font-750 text-#21170f',
  'transition hover:bg-#f2cca1 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88 disabled:cursor-wait disabled:opacity-55',
)
const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
)
const SECONDARY_BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-white/15 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88',
)
const DANGER_BUTTON_CLASSES = cx(
  'min-h-9 rounded-3 border border-#e78f8f/35 bg-transparent px-3 text-xs font-700',
  'text-#f0aaaa transition hover:bg-#e78f8f/10 focus-visible:outline-2',
  'focus-visible:outline-offset-2 focus-visible:outline-#f0aaaa disabled:cursor-wait disabled:opacity-45',
)
const TAB_CLASSES = cx(
  'min-h-11 whitespace-nowrap border-b-2 px-1 text-sm font-750 transition',
  'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-#e8bc88',
)
const WORKSPACE_TABS = [
  {id: 'details', label: '기본 정보'},
  {id: 'tracks', label: '수록곡'},
  {id: 'sales', label: '판매 및 공개'},
] as const
const LOCALE_LABELS = {
  en: '영어',
  ja: '일본어',
  ko: '한국어',
  'zh-Hans': '중국어 간체',
} as const

type WorkspaceTab = (typeof WORKSPACE_TABS)[number]['id']

interface AlbumTaskFormProps {
  readonly albumId: string
  readonly albumTitle: string
  readonly model: AdminMusicModel
}

interface TrackFormProps extends AlbumTaskFormProps {
  readonly onCancel: () => void
}

const TrackForm = (props: TrackFormProps) => (
  <form
    class="rounded-4 border border-#e8bc88/25 bg-#e8bc88/5 p-5 sm:p-6"
    onSubmit={(event) => props.model.handleTrackSubmit(event)}
  >
    <h3 class="m-0 text-base font-800">새 곡 추가</h3>
    <p class="mb-0 mt-2 text-xs leading-5 text-white/45">
      MP3 하나가 ‘{props.albumTitle}’의 수록곡 하나로 등록됩니다.
    </p>
    <input name="albumId" type="hidden" value={props.albumId} />
    <div class="mt-5">
      <TrackFields
        artist={props.model.trackArtist()}
        onArtistChange={props.model.setTrackArtist}
        onTitleChange={props.model.setTrackTitle}
        resetVersion={props.model.trackResetVersion()}
        title={props.model.trackTitle()}
      />
    </div>
    <div class="mt-5 flex flex-wrap justify-end gap-2">
      <button class={SECONDARY_BUTTON_CLASSES} onClick={() => props.onCancel()} type="button">
        닫기
      </button>
      <button class={BUTTON_CLASSES} disabled={props.model.isSavingTrack()} type="submit">
        {props.model.isSavingTrack() ? '곡 저장·MP3 검증 중…' : '곡 추가'}
      </button>
    </div>
  </form>
)

const OfferForm = (props: AlbumTaskFormProps) => (
  <form
    class="rounded-4 border border-white/10 bg-black/12 p-5"
    onSubmit={(event) => props.model.handleOfferSubmit(event)}
  >
    <h3 class="m-0 text-base font-750">앱인토스 상품 연결</h3>
    <p class="mb-0 mt-2 text-xs leading-5 text-white/45">
      나중에 연결해도 됩니다. 연결 전에는 판매 준비중으로 공개됩니다.
    </p>
    <input name="albumId" type="hidden" value={props.albumId} />
    <div class="mt-5 grid gap-4">
      <label class="grid gap-2 text-sm">
        앱인토스 상품 ID (SKU)
        <input
          class={FIELD_CLASSES}
          maxlength="255"
          name="externalProductId"
          placeholder="콘솔의 상품 ID"
          required
        />
      </label>
    </div>
    <button class={`${BUTTON_CLASSES} mt-5`} disabled={props.model.isSavingOffer()} type="submit">
      {props.model.isSavingOffer() ? '연결 중…' : '일회성 상품 연결'}
    </button>
  </form>
)

interface TrackPanelProps extends AlbumTaskFormProps {
  readonly albumStatus: AdminAlbum['status']
  readonly assets: ReadonlyArray<AdminAsset>
  readonly tracks: ReadonlyArray<AdminTrack>
}

const TrackPanel = (props: TrackPanelProps) => {
  const [isFormOpen, setIsFormOpen] = createSignal(false)
  const [playingTrackId, setPlayingTrackId] = createSignal<string | null>(null)
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
    <section aria-labelledby="tracks-tab" class="p-5 sm:p-6" id="tracks-panel" role="tabpanel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="m-0 text-lg font-800">수록곡 {playableTracks().length}</h3>
          <p class="mb-0 mt-1 text-sm leading-6 text-white/50">
            MP3 하나가 수록곡 하나입니다. MP3가 활성화된 곡만 여기에 표시됩니다.
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
        when={playableTracks().length > 0}
      >
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
                  disabled={props.model.removingTrackId() === track.id}
                  onClick={async (event) => handleTrackRemove(event, track)}
                  type="button"
                >
                  {props.model.removingTrackId() === track.id ? '삭제 중…' : '삭제'}
                </button>
                <div class="min-w-0 sm:col-start-2 sm:col-end-4">
                  <AdminTrackPreview
                    active={playingTrackId() === track.id}
                    fallback={
                      <div class="h-10 animate-pulse rounded-3 bg-white/5" aria-hidden="true" />
                    }
                    onPlay={() => setPlayingTrackId(track.id)}
                    title={track.title}
                    trackId={track.id}
                  />
                </div>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </section>
  )
}

interface AlbumDetailsPanelProps {
  readonly album: AdminAlbum
}

const AlbumDetailsPanel = (props: AlbumDetailsPanelProps) => {
  const koreanTranslation = () => getAlbumTranslation(props.album, 'ko')
  const optionalTranslations = () =>
    props.album.translations.filter((translation) => translation.locale !== 'ko')

  return (
    <section aria-labelledby="details-tab" class="p-5 sm:p-6" id="details-panel" role="tabpanel">
      <h3 class="m-0 text-lg font-800">기본 정보</h3>
      <p class="mb-0 mt-1 text-sm leading-6 text-white/50">
        사용자에게 표시되는 앨범 제목과 설명입니다.
      </p>
      <dl class="mb-0 mt-6 grid gap-5 rounded-4 bg-black/12 p-5">
        <div>
          <dt class="text-xs font-750 text-#e8bc88">한국어 제목</dt>
          <dd class="mb-0 ml-0 mt-1 text-base font-750">{koreanTranslation()?.title}</dd>
        </div>
        <div>
          <dt class="text-xs font-750 text-white/45">한국어 설명</dt>
          <dd class="mb-0 ml-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
            {koreanTranslation()?.description}
          </dd>
        </div>
      </dl>
      <details class="mt-4 rounded-4 border border-white/10 px-5 py-4">
        <summary class="cursor-pointer text-sm font-750 text-white/75">
          다른 언어 {optionalTranslations().length}개
        </summary>
        <div class="mt-4 grid gap-4">
          <Show
            fallback={<p class="m-0 text-sm text-white/45">등록된 선택 언어가 없습니다.</p>}
            when={optionalTranslations().length > 0}
          >
            <For each={optionalTranslations()}>
              {(translation) => (
                <article class="rounded-3 bg-white/4 p-4">
                  <p class="m-0 text-xs font-750 text-#e8bc88">
                    {LOCALE_LABELS[translation.locale]}
                  </p>
                  <h4 class="mb-0 mt-2 text-sm font-750">{translation.title}</h4>
                  <p class="mb-0 mt-2 whitespace-pre-wrap text-xs leading-5 text-white/55">
                    {translation.description}
                  </p>
                </article>
              )}
            </For>
          </Show>
        </div>
      </details>
    </section>
  )
}

interface SalesPanelProps extends AlbumTaskFormProps {
  readonly album: AdminAlbum
  readonly isStatusReviewOpen: boolean
  readonly offers: ReadonlyArray<AdminOffer>
  readonly onStatusReviewClose: () => void
  readonly onStatusReviewOpen: () => void
  readonly trackCount: number
}

const SalesPanel = (props: SalesPanelProps) => {
  const activeOffers = () =>
    props.offers.filter(
      (offer) =>
        offer.billingType === 'one_time' &&
        offer.productStatus === 'active' &&
        offer.status === 'active',
    )
  const isPublished = () => props.album.status === 'published'
  const handleStatusConfirm = async (): Promise<void> => {
    await props.model.handleAlbumStatusChange(props.album.id, isPublished() ? 'archive' : 'publish')
    props.onStatusReviewClose()
  }

  return (
    <section aria-labelledby="sales-tab" class="p-5 sm:p-6" id="sales-panel" role="tabpanel">
      <h3 class="m-0 text-lg font-800">판매 및 공개</h3>
      <p class="mb-0 mt-1 text-sm leading-6 text-white/50">
        앨범 공개와 상품 연결은 서로 독립적으로 관리합니다.
      </p>
      <div class="mt-6 grid gap-4 xl:grid-cols-2">
        <section class="rounded-4 border border-white/10 bg-black/12 p-5">
          <p class="m-0 text-xs font-750 text-white/45">공개 상태</p>
          <p class="mb-0 mt-2 text-base font-800">
            {isPublished() ? '현재 공개 중' : props.album.status === 'archived' ? '보관됨' : '초안'}
          </p>
          <p class="mb-0 mt-2 text-xs leading-5 text-white/50">
            {isPublished()
              ? '사용자 음악 목록에 이 앨범이 표시됩니다.'
              : '수록곡이 0개이거나 상품이 없어도 공개할 수 있습니다.'}
          </p>
          <button
            class={`${isPublished() ? SECONDARY_BUTTON_CLASSES : BUTTON_CLASSES} mt-5`}
            disabled={props.model.updatingAlbumId() === props.album.id}
            onClick={() => props.onStatusReviewOpen()}
            type="button"
          >
            {isPublished() ? '보관 검토' : '공개 검토'}
          </button>
        </section>
        <section class="rounded-4 border border-white/10 bg-black/12 p-5">
          <p class="m-0 text-xs font-750 text-white/45">판매 상태</p>
          <p class="mb-0 mt-2 text-base font-800">
            {activeOffers().length > 0 ? '판매 상품 연결됨' : '판매 준비중'}
          </p>
          <Show
            fallback={
              <p class="mb-0 mt-2 text-xs leading-5 text-white/50">
                공개 화면에는 판매 준비중으로 표시됩니다.
              </p>
            }
            when={activeOffers()[0]}
          >
            {(offer) => (
              <dl class="mb-0 mt-3 grid gap-2 text-xs">
                <div class="flex justify-between gap-3">
                  <dt class="text-white/45">채널</dt>
                  <dd class="m-0 text-white/75">앱인토스</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-white/45">상품 ID</dt>
                  <dd class="m-0 truncate text-white/75">{offer().externalProductId}</dd>
                </div>
              </dl>
            )}
          </Show>
        </section>
      </div>
      <Show when={props.isStatusReviewOpen}>
        <section
          aria-label="앨범 상태 변경 확인"
          class="mt-4 rounded-4 border border-#e8bc88/30 bg-#e8bc88/6 p-5"
        >
          <h4 class="m-0 text-base font-800">
            {isPublished() ? '이 앨범을 보관할까요?' : '이 앨범을 공개할까요?'}
          </h4>
          <dl class="mb-0 mt-4 grid gap-2 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-white/50">수록곡</dt>
              <dd class="m-0 font-700">{props.trackCount}곡</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-white/50">판매</dt>
              <dd class="m-0 font-700">
                {activeOffers().length > 0 ? '상품 연결됨' : '판매 준비중'}
              </dd>
            </div>
          </dl>
          <p class="mb-0 mt-4 text-xs leading-5 text-white/55">
            {isPublished()
              ? '보관하면 사용자 음악 목록에서 더 이상 보이지 않습니다.'
              : '수록곡이 없어도 공개됩니다. 상품이 없으면 가격을 표시하지 않습니다.'}
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              class={SECONDARY_BUTTON_CLASSES}
              onClick={() => props.onStatusReviewClose()}
              type="button"
            >
              취소
            </button>
            <button
              class={isPublished() ? SECONDARY_BUTTON_CLASSES : BUTTON_CLASSES}
              disabled={
                props.model.updatingAlbumId() === props.album.id ||
                (!isPublished() && !props.album.release.ready)
              }
              onClick={handleStatusConfirm}
              type="button"
            >
              {props.model.updatingAlbumId() === props.album.id
                ? '처리 중…'
                : isPublished()
                  ? '보관하기'
                  : '공개하기'}
            </button>
          </div>
        </section>
      </Show>
      <div class="mt-6 border-t border-white/8 pt-6">
        <Show
          fallback={
            <OfferForm albumId={props.albumId} albumTitle={props.albumTitle} model={props.model} />
          }
          when={activeOffers().length > 0}
        >
          <details class="rounded-4 border border-white/10 px-4 py-3">
            <summary class="cursor-pointer text-sm font-750 text-white/65">다른 상품 연결</summary>
            <div class="mt-4">
              <OfferForm
                albumId={props.albumId}
                albumTitle={props.albumTitle}
                model={props.model}
              />
            </div>
          </details>
        </Show>
      </div>
    </section>
  )
}

export interface AlbumWorkspaceProps {
  readonly album: AdminAlbum
  readonly model: AdminMusicModel
}

export const AlbumWorkspace = (props: AlbumWorkspaceProps) => {
  const [activeTab, setActiveTab] = createSignal<WorkspaceTab>('tracks')
  const [isStatusReviewOpen, setIsStatusReviewOpen] = createSignal(false)
  const albumTracks = () =>
    props.model.catalog().tracks.filter((track) => track.albumId === props.album.id)
  const trackIds = () => new Set(albumTracks().map((track) => track.id))
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
  const handleTabKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return
    }

    event.preventDefault()
    const currentIndex = WORKSPACE_TABS.findIndex((tab) => tab.id === activeTab())
    const lastIndex = WORKSPACE_TABS.length - 1
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % WORKSPACE_TABS.length
            : (currentIndex + lastIndex) % WORKSPACE_TABS.length
    const nextTab = WORKSPACE_TABS[nextIndex] ?? WORKSPACE_TABS[0]

    setActiveTab(nextTab.id)
    setIsStatusReviewOpen(false)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus()
  }

  return (
    <div class="grid gap-4">
      <AlbumReleaseCard
        activeOfferCount={activeOfferCount()}
        album={props.album}
        onPublicSettingsSelect={handlePublicSettingsSelect}
        trackCount={activeTrackCount()}
      />
      <div class="overflow-hidden rounded-5 border border-white/10 bg-white/3">
        <div
          aria-label="앨범 관리 영역"
          class="flex gap-6 overflow-x-auto border-b border-white/10 px-5"
          role="tablist"
        >
          <For each={WORKSPACE_TABS}>
            {(tab) => (
              <button
                aria-controls={`${tab.id}-panel`}
                aria-selected={activeTab() === tab.id}
                class={cx(
                  TAB_CLASSES,
                  activeTab() === tab.id
                    ? 'border-#e8bc88 text-white'
                    : 'border-transparent text-white/45 hover:text-white/75',
                )}
                id={`${tab.id}-tab`}
                onClick={() => {
                  setActiveTab(tab.id)
                  setIsStatusReviewOpen(false)
                }}
                onKeyDown={handleTabKeyDown}
                role="tab"
                tabindex={activeTab() === tab.id ? 0 : -1}
                type="button"
              >
                {tab.label}
                <Show when={tab.id === 'tracks'}> {activeTrackCount()}</Show>
              </button>
            )}
          </For>
        </div>
        <Switch>
          <Match when={activeTab() === 'details'}>
            <AlbumDetailsPanel album={props.album} />
          </Match>
          <Match when={activeTab() === 'tracks'}>
            <TrackPanel
              albumId={props.album.id}
              albumStatus={props.album.status}
              albumTitle={albumTitle()}
              assets={albumAssets()}
              model={props.model}
              tracks={albumTracks()}
            />
          </Match>
          <Match when={activeTab() === 'sales'}>
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
          </Match>
        </Switch>
      </div>
    </div>
  )
}
