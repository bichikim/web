import {Dialog} from '@kobalte/core/dialog'
import {type JSX, Show} from 'solid-js'

import './FocusRoomModal.css'

export interface FocusRoomModalProps {
  readonly children: JSX.Element
  readonly description?: string
  readonly getInitialFocus?: () => HTMLElement | null
  readonly headerMode?: 'closeOnly' | 'default'
  readonly isOpen: boolean
  readonly navigation?: JSX.Element
  readonly onCloseAutoFocus?: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly placement?: 'center' | 'top'
  readonly size?: 'regular' | 'wide'
  readonly title: string
  readonly titleVisibility?: 'visible' | 'visually-hidden'
}

export const FocusRoomModal = (props: FocusRoomModalProps) => (
  <Dialog modal onOpenChange={props.onOpenChange} open={props.isOpen}>
    <Dialog.Portal>
      <Dialog.Overlay class="focus-room-modal__overlay" />
      <Dialog.Content
        class="focus-room-backdrop focus-room-modal__content"
        data-placement={props.placement ?? 'center'}
        data-size={props.size ?? 'regular'}
        onCloseAutoFocus={(event) => {
          if (props.onCloseAutoFocus === undefined) {
            return
          }

          event.preventDefault()
          props.onCloseAutoFocus()
        }}
        onOpenAutoFocus={(event) => {
          const initialFocus = props.getInitialFocus?.()

          if (initialFocus === undefined || initialFocus === null) {
            return
          }

          event.preventDefault()
          initialFocus.focus()
        }}
      >
        <header
          class="focus-room-modal__header"
          data-has-navigation={props.navigation === undefined ? undefined : ''}
          data-mode={props.headerMode ?? 'default'}
          data-title-visibility={props.titleVisibility ?? 'visible'}
        >
          <Show
            fallback={<Dialog.Title class="sr-only">{props.title}</Dialog.Title>}
            when={(props.headerMode ?? 'default') === 'default'}
          >
            <div class="focus-room-modal__heading">
              <Dialog.Title class="focus-room-modal__title">{props.title}</Dialog.Title>
              <Show when={props.description}>
                {(description) => (
                  <Dialog.Description class="focus-room-modal__description">
                    {description()}
                  </Dialog.Description>
                )}
              </Show>
            </div>
          </Show>
          <Show when={props.navigation}>
            {(navigation) => <div class="focus-room-modal__navigation">{navigation()}</div>}
          </Show>
          <Dialog.CloseButton aria-label="닫기" class="focus-room-modal__close">
            <span aria-hidden="true" class="i-tabler-x size-5" />
          </Dialog.CloseButton>
        </header>
        <div class="focus-room-modal__body">{props.children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>
)
