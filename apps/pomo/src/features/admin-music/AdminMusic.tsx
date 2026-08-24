import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, type JSX, onMount, Show} from 'solid-js'

import {AlbumWorkspace} from './AlbumWorkspace'
import {
  type AdminAlbum,
  type AdminCatalog,
  type AlbumStatusAction,
  catalogSchema,
  getAlbumTranslation,
} from './catalog'
import {useAlbumDraft} from './use-album-draft'
import {useTrackManagement} from './use-track-management'

const AlbumTranslationFields = clientOnly(() => import('./AlbumTranslationFields'), {lazy: true})

const BUTTON_CLASSES = cx(
  'h-11 rounded-3 border border-#e8bc88/55 bg-#e8bc88 px-5 text-sm font-750 text-#21170f',
  'transition hover:bg-#f2cca1 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88 disabled:cursor-wait disabled:opacity-55',
)
const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
)
const COVER_PREVIEW_CLASSES = cx(
  'grid aspect-square w-full max-w-48 place-items-center overflow-hidden rounded-4 border',
  'border-white/15 bg-#27211c text-sm font-700 text-white/45',
)
const SECONDARY_BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-white/15 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88',
)
const readCatalog = async (): Promise<AdminCatalog> => {
  const response = await fetch('/api/admin/music')

  if (!response.ok) {
    throw new Error('음악 목록을 불러오지 못했습니다.')
  }

  return catalogSchema.parse(await response.json())
}

const postJson = async (url: string, body: Readonly<Record<string, unknown>>): Promise<void> => {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.')
  }
}

const useAdminMusic = () => {
  const [catalog, setCatalog] = createSignal<AdminCatalog>({
    albums: [],
    assets: [],
    offers: [],
    tracks: [],
  })
  const [isLoading, setIsLoading] = createSignal(true)
  const [isSavingOffer, setIsSavingOffer] = createSignal(false)
  const [isAlbumEditorOpen, setIsAlbumEditorOpen] = createSignal(false)
  const [selectedAlbumId, setSelectedAlbumId] = createSignal<string | null>(null)
  const [updatingAlbumId, setUpdatingAlbumId] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal<string | null>(null)

  const refreshCatalog = async (): Promise<void> => {
    const nextCatalog = await readCatalog()
    setCatalog(nextCatalog)
    setSelectedAlbumId((currentAlbumId) =>
      nextCatalog.albums.some((album) => album.id === currentAlbumId)
        ? currentAlbumId
        : (nextCatalog.albums[0]?.id ?? null),
    )
  }

  const albumDraft = useAlbumDraft({
    onAlbumCreated: (albumId) => {
      setSelectedAlbumId(albumId)
      setIsAlbumEditorOpen(false)
    },
    refreshCatalog,
    setMessage,
  })
  const trackManagement = useTrackManagement({refreshCatalog, setMessage})
  const selectedAlbum = createMemo(
    () => catalog().albums.find((album) => album.id === selectedAlbumId()) ?? null,
  )
  const albumStats = createMemo(() => {
    const {albums} = catalog()

    return {
      draft: albums.filter((album) => album.status === 'draft').length,
      published: albums.filter((album) => album.status === 'published').length,
      total: albums.length,
    }
  })

  onMount(async () => {
    try {
      await refreshCatalog()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '음악 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  })

  const handleAlbumStatusChange = async (
    albumId: string,
    action: AlbumStatusAction,
  ): Promise<void> => {
    setUpdatingAlbumId(albumId)
    setMessage(null)

    try {
      await postJson('/api/admin/music/status', {action, albumId})
      await refreshCatalog()
      setMessage(action === 'publish' ? '앨범을 공개했습니다.' : '앨범을 보관했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '앨범 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingAlbumId(null)
    }
  }

  const handleOfferSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const offerForm = event.currentTarget
    const form = new FormData(offerForm)
    setIsSavingOffer(true)
    setMessage(null)

    try {
      await postJson('/api/admin/music/offers', {
        albumId: String(form.get('albumId') ?? ''),
        externalProductId: String(form.get('externalProductId') ?? ''),
        provider: 'apps-in-toss',
      })
      offerForm.reset()
      await refreshCatalog()
      setMessage('앱인토스 일회성 판매 상품을 연결했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '판매 상품을 연결하지 못했습니다.')
    } finally {
      setIsSavingOffer(false)
    }
  }

  return {
    ...albumDraft,
    ...trackManagement,
    albumStats,
    catalog,
    handleAlbumStatusChange,
    handleOfferSubmit,
    isAlbumEditorOpen,
    isLoading,
    isSavingOffer,
    message,
    selectedAlbum,
    selectedAlbumId,
    setIsAlbumEditorOpen,
    setSelectedAlbumId,
    updatingAlbumId,
  }
}

export type AdminMusicModel = ReturnType<typeof useAdminMusic>

interface AdminMusicHeaderProps {
  readonly model: AdminMusicModel
}

const AdminMusicHeader = (props: AdminMusicHeaderProps) => (
  <header class="mx-auto w-full max-w-6xl">
    <A class="text-sm text-white/60 transition hover:text-white" href="/admin">
      ← 관리자 홈
    </A>
    <div class="mt-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="m-0 text-xs font-750 tracking-[0.2em] text-#e8bc88 uppercase">Music catalog</p>
        <h1 class="mb-0 mt-2 text-3xl font-800 tracking--0.04em">음악 / 앨범 관리</h1>
        <p class="mb-0 mt-2 max-w-2xl text-sm leading-6 text-white/60">
          앨범 하나를 선택하고 필요한 작업만 이어서 완료하세요.
        </p>
      </div>
      <Show when={!props.model.isLoading() && props.model.albumStats().total > 0}>
        <button
          class={props.model.isAlbumEditorOpen() ? SECONDARY_BUTTON_CLASSES : BUTTON_CLASSES}
          onClick={() => props.model.setIsAlbumEditorOpen((isOpen) => !isOpen)}
          type="button"
        >
          {props.model.isAlbumEditorOpen() ? '작성 화면 닫기' : '+ 새 앨범 만들기'}
        </button>
      </Show>
    </div>
    <dl class="mb-0 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div class="flex items-baseline gap-2">
        <dt class="text-white/45">전체</dt>
        <dd class="m-0 font-750 text-white">{props.model.albumStats().total}</dd>
      </div>
      <div class="flex items-baseline gap-2">
        <dt class="text-white/45">초안</dt>
        <dd class="m-0 font-750 text-#f2bd85">{props.model.albumStats().draft}</dd>
      </div>
      <div class="flex items-baseline gap-2">
        <dt class="text-white/45">공개</dt>
        <dd class="m-0 font-750 text-#99d6aa">{props.model.albumStats().published}</dd>
      </div>
    </dl>
  </header>
)

interface AdminMusicFormProps {
  readonly model: AdminMusicModel
}

const AlbumDraftForm = (props: AdminMusicFormProps) => (
  <form
    class="rounded-5 border border-#e8bc88/20 bg-white/4 p-5 sm:p-7"
    onSubmit={(event) => props.model.handleAlbumSubmit(event)}
  >
    <div>
      <p class="m-0 text-xs font-750 text-#e8bc88">새 앨범</p>
      <h2 class="mb-0 mt-1 text-xl font-800">앨범 기본 정보 작성</h2>
      <p class="mb-0 mt-2 text-sm leading-6 text-white/50">
        한국어 제목과 설명만 필수입니다. 나머지 작업은 앨범을 만든 뒤 이어서 진행합니다.
      </p>
    </div>
    <div class="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
      <AlbumTranslationFields
        fallback={<p class="text-sm text-white/45">앨범 입력 화면을 준비하는 중…</p>}
        onValuesChange={props.model.handleTranslationsChange}
        values={props.model.albumTranslations()}
      />
      <section class="grid content-start gap-4 rounded-4 bg-black/12 p-4">
        <div>
          <h3 class="m-0 text-sm font-750">커버 이미지</h3>
          <p class="mb-0 mt-1 text-xs leading-5 text-white/45">파일 업로드를 권장합니다.</p>
        </div>
        <label class="grid gap-2 text-sm">
          이미지 파일
          <input
            accept="image/jpeg,image/png,image/webp"
            class={FIELD_CLASSES}
            name="coverFile"
            onChange={(event) => props.model.handleCoverChange(event)}
            type="file"
          />
          <span class="text-xs leading-5 text-white/45">
            최대 10MB · 중앙 정사각형 크롭 · 1200×1200 WebP
          </span>
        </label>
        <Show when={props.model.coverPreviewUrl()}>
          {(previewUrl) => (
            <figure class="m-0 grid gap-2">
              <div class={COVER_PREVIEW_CLASSES}>
                <img
                  alt="업로드할 앨범 커버 미리보기"
                  class="size-full object-cover"
                  src={previewUrl()}
                />
              </div>
              <figcaption class="text-xs text-white/45">업로드될 최종 이미지입니다.</figcaption>
            </figure>
          )}
        </Show>
        <details class="rounded-3 border border-white/10 px-3 py-2">
          <summary class="cursor-pointer text-xs font-700 text-white/60">다른 방식 사용</summary>
          <div class="mt-3 grid gap-4">
            <label class="grid gap-2 text-sm">
              외부 HTTPS 주소
              <input
                class={FIELD_CLASSES}
                name="coverImageUrl"
                onInput={(event) => props.model.handleCoverImageUrlInput(event)}
                placeholder="https://…"
                type="url"
                value={props.model.coverImageUrl()}
              />
            </label>
            <label class="grid gap-2 text-sm">
              이미지가 없을 때
              <select
                class={FIELD_CLASSES}
                name="coverFallback"
                onChange={(event) => props.model.handleCoverFallbackChange(event)}
                value={props.model.coverFallback()}
              >
                <option value="lp">LP판</option>
                <option value="cd">CD</option>
                <option value="music">음악 아이콘</option>
              </select>
            </label>
          </div>
        </details>
      </section>
    </div>
    <div class="mt-7 flex justify-end border-t border-white/8 pt-5">
      <button
        class={BUTTON_CLASSES}
        disabled={
          props.model.isSavingAlbum() ||
          props.model.isProcessingCover() ||
          props.model.isRestoringDraft()
        }
        type="submit"
      >
        {props.model.isRestoringDraft()
          ? '앨범 초안 복원 중…'
          : props.model.isProcessingCover()
            ? '커버 이미지 처리 중…'
            : props.model.isSavingAlbum()
              ? '커버 업로드 및 저장 중…'
              : '앨범 초안 만들기'}
      </button>
    </div>
  </form>
)

interface AlbumNavigationProps {
  readonly albums: ReadonlyArray<AdminAlbum>
  readonly onAlbumSelect: (albumId: string) => void
  readonly selectedAlbumId: string | null
  readonly trackCount: (albumId: string) => number
}

const AlbumNavigation = (props: AlbumNavigationProps) => (
  <nav aria-label="등록된 앨범" class="rounded-5 border border-white/10 bg-white/3 p-3">
    <div class="flex items-baseline justify-between gap-3 px-2 py-2">
      <h2 class="m-0 text-sm font-750">등록된 앨범</h2>
      <span class="text-xs text-white/40">{props.albums.length}개</span>
    </div>
    <div class="mt-2 grid gap-1">
      <For each={props.albums}>
        {(album) => {
          const translation = () => getAlbumTranslation(album, 'ko')
          const isSelected = () => props.selectedAlbumId === album.id

          return (
            <button
              aria-pressed={isSelected()}
              class={cx(
                'flex w-full items-center gap-3 rounded-4 border px-3 py-3 text-left transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#e8bc88',
                isSelected()
                  ? 'border-#e8bc88/45 bg-#e8bc88/10'
                  : 'border-transparent hover:border-white/10 hover:bg-white/5',
              )}
              onClick={() => props.onAlbumSelect(album.id)}
              type="button"
            >
              <span
                class={cx(
                  'grid size-10 shrink-0 place-items-center overflow-hidden rounded-3 bg-black/20',
                  'text-xs font-800 text-#e8bc88',
                )}
              >
                <Show
                  fallback={
                    album.coverFallback === 'music' ? '♪' : album.coverFallback.toUpperCase()
                  }
                  when={album.coverImageUrl}
                >
                  {(coverImageUrl) => (
                    <img alt="" class="size-full object-cover" src={coverImageUrl()} />
                  )}
                </Show>
              </span>
              <span class="min-w-0 grow">
                <span class="block truncate text-sm font-750">
                  {translation()?.title ?? '제목 없음'}
                </span>
                <span class="mt-1 flex items-center gap-2 text-xs">
                  <span class={album.status === 'published' ? 'text-#99d6aa' : 'text-#f2bd85'}>
                    {album.status === 'published'
                      ? '공개'
                      : album.status === 'archived'
                        ? '보관'
                        : '초안'}
                  </span>
                  <span class="text-white/25">·</span>
                  <span class="text-white/45">{props.trackCount(album.id)}곡</span>
                </span>
              </span>
            </button>
          )
        }}
      </For>
    </div>
  </nav>
)

export const AdminMusic = () => {
  const model = useAdminMusic()
  const getTrackCount = (albumId: string): number => {
    const albumTrackIds = new Set(
      model
        .catalog()
        .tracks.filter((track) => track.albumId === albumId)
        .map((track) => track.id),
    )

    return model
      .catalog()
      .assets.filter((asset) => asset.status === 'active' && albumTrackIds.has(asset.trackId))
      .length
  }

  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>음악 / 앨범 관리 · Pomo</Title>
      <AdminMusicHeader model={model} />

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
            trackCount={getTrackCount}
          />
          <Show when={model.selectedAlbum()}>
            {(album) => <AlbumWorkspace album={album()} model={model} />}
          </Show>
        </section>
      </Show>
    </main>
  )
}
