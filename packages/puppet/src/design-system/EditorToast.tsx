import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import {EditorButton} from './EditorButton'

interface EditorToastProps {
  readonly message?: string
  readonly onDismiss?: () => void
}

const ToastSurface = (props: EditorToastProps) => {
  const [surface, setSurface] = createSignal<HTMLDivElement | null>(null)
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      props.onDismiss?.()
    }
  }
  onMount(() => {
    const element = surface()
    if (element === null) {
      return
    }
    const previousFocus = element.ownerDocument.activeElement
    element.showPopover?.()
    onCleanup(() => {
      if (
        element.contains(element.ownerDocument.activeElement) &&
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus()
      }
    })
  })
  return (
    <div
      ref={setSurface}
      class="editor-toast"
      popover="manual"
      role="alert"
      aria-atomic="true"
      onKeyDown={handleKeyDown}
    >
      <span>{props.message}</span>
      <Show when={props.onDismiss}>
        <EditorButton aria-label="알림 닫기" onClick={props.onDismiss}>
          <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
        </EditorButton>
      </Show>
    </div>
  )
}

export const EditorToast = (props: EditorToastProps) => (
  <Show when={props.message}>
    <ToastSurface message={props.message} onDismiss={props.onDismiss} />
  </Show>
)
