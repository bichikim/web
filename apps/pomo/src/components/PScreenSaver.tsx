import {createEffect, onMount, Show} from 'solid-js'

export interface PScreenSaverProps {
  readonly isActive?: boolean
  readonly onDismiss?: () => void
  readonly timer?: PScreenSaverTimer
  readonly track?: PScreenSaverTrack | null
}

export interface PScreenSaverTimer {
  readonly status: string
  readonly time: string
}

export interface PScreenSaverTrack {
  readonly artist: string
  readonly title: string
}

export const PScreenSaver = (props: PScreenSaverProps) => {
  let dialogElement: HTMLDialogElement | undefined

  const handleDismiss = () => {
    if (dialogElement?.open) {
      dialogElement.close()
    }
    props.onDismiss?.()
  }

  onMount(() => {
    createEffect(() => {
      if (props.isActive ?? false) {
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
      class="pomo-screen-saver"
      onCancel={(event) => {
        event.preventDefault()
        handleDismiss()
      }}
      onKeyDown={handleDismiss}
      onPointerDown={handleDismiss}
      ref={(element) => {
        dialogElement = element
      }}
    >
      <div class="pomo-screen-saver__safe-area">
        <div class="pomo-screen-saver__content">
          <Show when={props.timer}>
            {(timer) => (
              <section aria-label="포모도로 상태" class="pomo-screen-saver__timer">
                <span>{timer().status}</span>
                <strong>{timer().time}</strong>
              </section>
            )}
          </Show>
          <Show when={props.track}>
            {(track) => (
              <section aria-label="현재 음악" class="pomo-screen-saver__track">
                <p>{track().title}</p>
                <span>{track().artist}</span>
              </section>
            )}
          </Show>
          <p aria-hidden="true" class="pomo-screen-saver__hint">
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
