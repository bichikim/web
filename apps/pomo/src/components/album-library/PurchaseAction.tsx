import {getLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'
import {Show} from 'solid-js'

import {formatMinorAmount, type PaymentFlowState} from '../../features/payment'
import type {PAlbumOffer, PResolvedAlbum} from '../../features/focus-room-audio'
import {P_BUTTON_CLASSES, PButton} from '../p-button/PButton'

interface AlbumPurchaseActionProps {
  readonly album: PResolvedAlbum
  readonly onPurchase: (productId: string) => void
  readonly state: PaymentFlowState
}

const getPaddleOffer = (album: PResolvedAlbum): PAlbumOffer | undefined =>
  album.offers?.find((offer) => offer.provider === 'paddle')

const isCurrentProduct = (album: PResolvedAlbum, state: PaymentFlowState): boolean =>
  album.productId !== undefined && 'productId' in state && state.productId === album.productId

const getLoginHref = (): string => `/account?returnTo=${encodeURIComponent('/')}`

const getRejectedMessage = (code: Extract<PaymentFlowState, {status: 'rejected'}>['code']) => {
  switch (code) {
    case 'already_owned':
      return m.album_purchase_already_owned()
    case 'login_required':
      return m.album_purchase_login_required()
    case 'price_changed':
      return m.album_purchase_price_changed()
    case 'provider_unavailable':
      return m.album_purchase_provider_unavailable()
    case 'unavailable':
      return m.album_purchase_unavailable()
  }
}

export const AlbumPurchaseAction = (props: AlbumPurchaseActionProps) => {
  const offer = () => getPaddleOffer(props.album)
  const canPurchase = () => {
    const {productId} = props.album
    const paddleOffer = offer()

    return (
      productId !== undefined &&
      paddleOffer !== undefined &&
      paddleOffer.amountMinor !== null &&
      paddleOffer.currency !== null &&
      paddleOffer.fractionalDigits !== null
    )
  }
  const currentState = () => (isCurrentProduct(props.album, props.state) ? props.state : null)
  const purchasableProductId = () => (canPurchase() ? props.album.productId : undefined)
  const pendingState = () => {
    const state = currentState()
    return state?.status === 'pending' ? state : undefined
  }
  const rejectedState = () => {
    const state = currentState()
    return state?.status === 'rejected' ? state : undefined
  }
  const isBusy = () => {
    const status = currentState()?.status
    return status === 'preparing' || status === 'redirecting' || status === 'pending'
  }
  const priceLabel = () => {
    const paddleOffer = offer()

    if (
      paddleOffer?.amountMinor === null ||
      paddleOffer?.amountMinor === undefined ||
      paddleOffer.currency === null ||
      paddleOffer.currency === undefined ||
      paddleOffer.fractionalDigits === null ||
      paddleOffer.fractionalDigits === undefined
    ) {
      return m.album_sale_price_pending()
    }

    return formatMinorAmount({
      amountMinor: paddleOffer.amountMinor,
      currency: paddleOffer.currency,
      fractionalDigits: paddleOffer.fractionalDigits,
      locale: getLocale(),
    })
  }

  return (
    <div class="border-t border-solid border-border px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm font-750 text-foreground">{priceLabel()}</span>
        <Show
          when={purchasableProductId()}
          fallback={
            <span class="text-sm leading-5 font-700 text-highlight">
              {m.album_sale_preparing()}
            </span>
          }
        >
          {(productId) => (
            <Show
              when={
                currentState()?.status !== 'redirecting' && currentState()?.status !== 'pending'
              }
              fallback={
                <span
                  aria-live="polite"
                  class="text-sm leading-5 font-700 text-highlight"
                  role="status"
                >
                  {currentState()?.status === 'pending'
                    ? m.album_purchase_pending()
                    : m.album_purchase_redirecting()}
                </span>
              }
            >
              <PButton
                bordered
                disabled={isBusy()}
                onPress={() => props.onPurchase(productId())}
                size="small"
                tone="primary"
              >
                {currentState()?.status === 'preparing'
                  ? m.album_purchase_preparing()
                  : m.album_purchase_button()}
              </PButton>
            </Show>
          )}
        </Show>
      </div>
      <Show when={pendingState()}>
        {(state) => (
          <a
            class={P_BUTTON_CLASSES({class: 'mt-3 no-underline', size: 'small', transparent: true})}
            href={`/payments/return?order_id=${encodeURIComponent(state().orderId)}`}
          >
            {m.album_purchase_check_status()}
          </a>
        )}
      </Show>
      <Show when={currentState()?.status === 'canceled'}>
        <p
          aria-live="polite"
          class="mb-0 mt-3 text-sm leading-5 text-muted-foreground"
          role="status"
        >
          {m.album_purchase_canceled()}
        </p>
      </Show>
      <Show when={currentState()?.status === 'failed'}>
        <p aria-live="polite" class="mb-0 mt-3 text-sm leading-5 text-danger" role="alert">
          {m.album_purchase_failed()}
        </p>
      </Show>
      <Show when={rejectedState()}>
        {(state) => (
          <>
            <p aria-live="polite" class="mb-0 mt-3 text-sm leading-5 text-danger" role="alert">
              {getRejectedMessage(state().code)}
            </p>
            <Show when={state().code === 'login_required'}>
              <a
                class={P_BUTTON_CLASSES({
                  class: 'mt-3 no-underline',
                  size: 'small',
                  transparent: true,
                })}
                href={getLoginHref()}
              >
                {m.album_purchase_sign_in()}
              </a>
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}
