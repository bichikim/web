import {createEffect, onMount, Show} from 'solid-js'

import './FocusRoomScreenSaver.css'

export interface FocusRoomScreenSaverProps {
  readonly isActive: boolean
  readonly onDismiss: () => void
  readonly timer: FocusRoomScreenSaverTimer
  readonly track: FocusRoomScreenSaverTrack | null
}

export interface FocusRoomScreenSaverTimer {
  readonly status: string
  readonly time: string
}

export interface FocusRoomScreenSaverTrack {
  readonly artist: string
  readonly title: string
}

export const FocusRoomScreenSaver = (props: FocusRoomScreenSaverProps) => {
  let dialogElement: HTMLDialogElement | undefined

  onMount(() => {
    createEffect(() => {
      if (props.isActive) {
        if (!dialogElement?.open) {
          dialogElement?.showModal()
        }
        return
      }

      if (dialogElement?.open) {
        dialogElement.close()
      }
    })
  })

  return (
    <dialog
      aria-label="스크린 세이버"
      class="focus-room-screen-saver"
      onCancel={(event) => {
        event.preventDefault()
        props.onDismiss()
      }}
      onKeyDown={() => props.onDismiss()}
      onPointerDown={() => props.onDismiss()}
      ref={(element) => {
        dialogElement = element
      }}
    >
      <div class="focus-room-screen-saver__safe-area">
        <div class="focus-room-screen-saver__content">
          <section aria-label="포모도로 상태" class="focus-room-screen-saver__timer">
            <span>{props.timer.status}</span>
            <strong>{props.timer.time}</strong>
          </section>
          <Show when={props.track}>
            {(track) => (
              <section aria-label="현재 음악" class="focus-room-screen-saver__track">
                <p>{track().title}</p>
                <span>{track().artist}</span>
              </section>
            )}
          </Show>
          <p aria-hidden="true" class="focus-room-screen-saver__hint">
            터치하거나 마우스를 움직이거나 클릭하면 돌아가요
          </p>
        </div>
      </div>
      <span class="sr-only">
        화면을 터치하거나 마우스를 움직이거나 클릭하거나 아무 키나 누르면 집중룸으로 돌아갑니다.
      </span>
    </dialog>
  )
}
