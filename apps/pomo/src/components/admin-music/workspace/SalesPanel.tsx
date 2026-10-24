import {Show} from 'solid-js'
import {type AdminAlbum, type AdminOffer} from '../../../features/admin-music'
import {BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES} from '../button-classes'
import {type AlbumTaskFormProps} from './form-props'
import {OfferForm} from './OfferForm'

interface SalesPanelProps extends AlbumTaskFormProps {
  readonly album: AdminAlbum
  readonly isStatusReviewOpen: boolean
  readonly offers: ReadonlyArray<AdminOffer>
  readonly onStatusReviewClose: () => void
  readonly onStatusReviewOpen: () => void
  readonly trackCount: number
}

export const SalesPanel = (props: SalesPanelProps) => {
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
    <div class="p-5 sm:p-6">
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
            disabled={props.model.isUpdatingAlbum(props.album.id)}
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
                props.model.isUpdatingAlbum(props.album.id) ||
                (!isPublished() && !props.album.release.ready)
              }
              onClick={handleStatusConfirm}
              type="button"
            >
              {props.model.isUpdatingAlbum(props.album.id)
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
    </div>
  )
}
