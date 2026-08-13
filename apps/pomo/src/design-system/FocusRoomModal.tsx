import {Dialog} from '@kobalte/core/dialog'
import {type JSX, Show} from 'solid-js'

import './FocusRoomModal.css'

export interface FocusRoomModalProps {
  readonly children: JSX.Element
  readonly description?: string
  readonly isOpen: boolean
  readonly onCloseAutoFocus?: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly title: string
}

export const FocusRoomModal = (props: FocusRoomModalProps) => (
  <Dialog modal onOpenChange={props.onOpenChange} open={props.isOpen}>
    <Dialog.Portal>
      <Dialog.Overlay class="focus-room-modal__overlay" />
      <Dialog.Content
        class="focus-room-backdrop focus-room-modal__content"
        onCloseAutoFocus={(event) => {
          if (props.onCloseAutoFocus === undefined) {
            return
          }

          event.preventDefault()
          props.onCloseAutoFocus()
        }}
      >
        <header class="focus-room-modal__header">
          <div class="min-w-0">
            <Dialog.Title class="focus-room-modal__title">{props.title}</Dialog.Title>
            <Show when={props.description}>
              {(description) => (
                <Dialog.Description class="focus-room-modal__description">
                  {description()}
                </Dialog.Description>
              )}
            </Show>
          </div>
          <Dialog.CloseButton aria-label="닫기" class="focus-room-modal__close">
            <span aria-hidden="true" class="i-tabler-x size-5" />
          </Dialog.CloseButton>
        </header>
        <div class="focus-room-modal__body">{props.children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>
)
