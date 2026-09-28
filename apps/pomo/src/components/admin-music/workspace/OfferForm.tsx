import {PInput} from 'src/components/p-input/PInput'
import {cx} from 'class-variance-authority'
import {BUTTON_CLASSES} from '../button-classes'
import {type AlbumTaskFormProps} from './form-props'

const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
)

export const OfferForm = (props: AlbumTaskFormProps) => (
  <form
    aria-label="일회성 상품 연결"
    class="rounded-4 border border-white/10 bg-black/12 p-5"
    onSubmit={(event) => props.model.handleOfferSubmit(event)}
  >
    <h3 class="m-0 text-base font-750">일회성 상품 연결</h3>
    <p class="mb-0 mt-2 text-xs leading-5 text-white/45">
      나중에 연결해도 됩니다. 연결 전에는 판매 준비중으로 공개됩니다.
    </p>
    <input name="albumId" type="hidden" value={props.albumId} />
    <div class="mt-5 grid gap-4">
      <label class="grid gap-2 text-sm">
        판매 채널
        <select class={FIELD_CLASSES} name="provider" value="apps-in-toss">
          <option value="apps-in-toss">앱인토스</option>
          <option value="paddle">Paddle 웹</option>
        </select>
      </label>
      <label class="grid gap-2 text-sm">
        외부 상품 ID
        <PInput
          unstyled
          class={FIELD_CLASSES}
          maxlength="255"
          name="externalProductId"
          placeholder="SKU 또는 Paddle Price ID"
          required
        />
      </label>
      <fieldset class="grid gap-4 rounded-3 border border-white/10 p-4">
        <legend class="px-2 text-sm font-700">Paddle 웹 가격</legend>
        <p class="m-0 text-xs leading-5 text-white/45">
          Paddle 웹을 선택할 때만 입력합니다. 금액은 통화의 최소 단위입니다. 예: USD 10.00은 1000
        </p>
        <label class="grid gap-2 text-sm">
          금액 (최소 단위)
          <PInput
            unstyled
            class={FIELD_CLASSES}
            inputmode="numeric"
            name="amountMinor"
            pattern="[0-9]+"
            placeholder="1000"
          />
        </label>
        <label class="grid gap-2 text-sm">
          통화
          <PInput unstyled class={FIELD_CLASSES} maxlength="3" name="currency" placeholder="USD" />
        </label>
        <label class="grid gap-2 text-sm">
          소수 자릿수
          <PInput
            unstyled
            class={FIELD_CLASSES}
            max="6"
            min="0"
            name="fractionalDigits"
            placeholder="2"
            type="number"
          />
        </label>
      </fieldset>
    </div>
    <button class={`${BUTTON_CLASSES} mt-5`} disabled={props.model.isSavingOffer()} type="submit">
      {props.model.isSavingOffer() ? '연결 중…' : '일회성 상품 연결'}
    </button>
  </form>
)
