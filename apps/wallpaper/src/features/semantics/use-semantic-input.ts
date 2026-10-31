import {SEMANTIC_TEXT_LIMIT} from '@winter-love/wallpaper/settings/semantics'
import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import {sendSemanticInput, subscribeSemanticReady} from './channel'

interface UseSemanticInputProps {
  readonly widgetId: Accessor<string | undefined>
  readonly text: Accessor<string>
}
export const useSemanticInput = (props: UseSemanticInputProps) => {
  const text = createMemo(() => props.text().slice(-SEMANTIC_TEXT_LIMIT))
  createEffect(() => {
    const id = props.widgetId()
    if (id === undefined) {
      return
    }
    const publish = () =>
      sendSemanticInput({text: text(), widgetId: id}).catch((cause: unknown) =>
        console.error('Semantic input delivery failed', cause),
      )
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
