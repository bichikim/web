import {createEffect, createSignal, createUniqueId, type JSX, onCleanup} from 'solid-js'
import {Portal} from 'solid-js/web'

interface SDialogProps {
  readonly title: string
  readonly children?: JSX.Element
  readonly onClose?: () => void
}

export const SDialog = (props: SDialogProps) => {
  const title = createUniqueId()
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  createEffect(() => {
    const dialog = element()
    if (dialog !== null) {
      const previous = dialog.ownerDocument.activeElement
      dialog.showModal()
      onCleanup(() => {
        dialog.close()
        if (previous instanceof HTMLElement && previous.isConnected) {
          previous.focus()
        }
      })
    }
  })
  const handleCancel = (event: Event) => {
    event.preventDefault()
    props.onClose?.()
  }
  return (
    <Portal>
      <dialog
        ref={setElement}
        aria-labelledby={title}
        onCancel={handleCancel}
        class="m-auto box-border w-[calc(100%-2rem)] max-w-112 max-h-[calc(100dvh-3rem)]
        flex-col overflow-hidden rounded-xl border border-solid border-stone-200 bg-stone-50 p-0
        text-stone-800 shadow-xl open:flex backdrop:bg-black/25"
      >
        <header
          class="flex shrink-0 items-center justify-between gap-3
          border-0 border-b border-solid border-stone-200 px-4 py-3"
        >
          <h2 id={title} class="m-0 text-sm font-semibold">
            {props.title}
          </h2>
          <button type="button" class="wallpaper-file-button" onClick={() => props.onClose?.()}>
            닫기
          </button>
        </header>
        {props.children}
      </dialog>
    </Portal>
  )
}
