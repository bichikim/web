import {cx} from 'class-variance-authority'
import {BUTTON_CLASSES} from '../button-classes'
import {type AlbumTaskFormProps} from './form-props'

const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
)

export const OfferForm = (props: AlbumTaskFormProps) => (
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
