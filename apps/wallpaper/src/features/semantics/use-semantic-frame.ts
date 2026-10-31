import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import type {SemanticFrame} from '@winter-love/wallpaper/settings/semantics'
import {requestSemanticFrame, subscribeSemanticFrame, subscribeSemanticReady} from './channel'

interface UseSemanticFrameProps {
  /** Widget whose automatic scores and manual selection are received. */
  readonly widgetId: Accessor<string | undefined>
  /** Subscribe while at least one connection can execute. */
  readonly enabled: Accessor<boolean>
}
export const useSemanticFrame = (props: UseSemanticFrameProps): Accessor<SemanticFrame | null> => {
  const [current, setCurrent] = createSignal<SemanticFrame | null>(null)
  createEffect(() => {
    const id = props.widgetId()
    setCurrent(null)
    if (id === undefined || !props.enabled()) {
      return
    }
    let disposed = false
    const request = () => requestSemanticFrame(id).catch(console.error)
    const subscriptions = [
      subscribeSemanticFrame((frame) => {
        if (!disposed && frame.widgetId === id) {
          setCurrent(frame)
        }
      }),
      subscribeSemanticReady(request),
    ]
    Promise.all(subscriptions)
      .then(() => {
        if (!disposed) {
          request()
        }
      })
      .catch(console.error)
    onCleanup(() => {
      disposed = true
      for (const subscription of subscriptions) {
        subscription.then((stop) => stop()).catch(console.error)
      }
    })
  })
  return current
}
