import {
  SEMANTIC_TEXT_LIMIT,
  type SemanticNarration,
} from '@winter-love/wallpaper/settings/semantics'
import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import {sendSemanticInput, subscribeSemanticReady} from './channel'

interface UseSemanticInputProps {
  readonly widgetId: Accessor<string | undefined>
  readonly text: Accessor<string>
  /** Current narration identity; omitted disables random fallback. */
  readonly readoutId?: Accessor<string | undefined>
  /** Explicit audio lifecycle; omitted preserves the existing text-only input contract. */
  readonly narration?: Accessor<SemanticNarration | undefined>
}
export const useSemanticInput = (props: UseSemanticInputProps) => {
  const text = createMemo(() => props.text().slice(-SEMANTIC_TEXT_LIMIT))
  createEffect(() => {
    const id = props.widgetId()
    if (id === undefined) {
      return
    }
    const publish = () =>
      sendSemanticInput({
        text: text(),
        widgetId: id,
        ...(props.readoutId?.() === undefined ? {} : {readoutId: props.readoutId?.()}),
        ...(props.narration?.() === undefined ? {} : {narration: props.narration?.()}),
      }).catch((cause: unknown) => console.error('Semantic input delivery failed', cause))
    let disposed = false
    let stop: (() => void) | null = null
    subscribeSemanticReady(publish)
      .then((unsubscribe) => {
        if (disposed) {
          unsubscribe()
        } else {
          stop = unsubscribe
          publish()
        }
      })
      .catch((cause: unknown) => console.error('Semantic input subscription failed', cause))
    createEffect(publish)
    onCleanup(() => {
      disposed = true
      stop?.()
      sendSemanticInput({text: '', widgetId: id}).catch(console.error)
    })
  })
}
