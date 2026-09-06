import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type AdminMusicModel} from '../../features/admin-music'
import {BUTTON_CLASSES} from './draft-button-classes'

const AlbumTranslationFields = clientOnly(
  async () => {
    const {AlbumTranslationFields} = await import('./AlbumTranslationFields')
    return {default: AlbumTranslationFields}
  },
  {
    lazy: true,
  },
)

const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
)

const COVER_PREVIEW_CLASSES = cx(
  'grid aspect-square w-full max-w-48 place-items-center overflow-hidden rounded-4 border',
  'border-white/15 bg-#27211c text-sm font-700 text-white/45',
)

interface AdminMusicFormProps {
  readonly model: AdminMusicModel
}

export const AlbumDraftForm = (props: AdminMusicFormProps) => (
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
