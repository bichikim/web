import {createSignal, onCleanup, onMount} from 'solid-js'
import {subscribeWebStorageChange} from 'src/utils/subscribe-web-storage-change'
export interface CollectionChangeSignalOptions<Value> {
  readonly read: () => ReadonlyArray<Value>
  readonly event: string
  readonly webStorageKey?: string
  readonly events?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
}
/** Restores a collection after mount and refreshes it on storage-change notifications. */
export const createCollectionChangeSignal = <Value>(
  options: CollectionChangeSignalOptions<Value>,
) => {
  const [values, setValues] = createSignal<ReadonlyArray<Value>>([])
  onMount(() => {
    const refresh = () => setValues(options.read())
    refresh()
    const events = options.events ?? globalThis
    events.addEventListener(options.event, refresh)
    const unsubscribe =
      options.webStorageKey === undefined
        ? undefined
        : subscribeWebStorageChange({key: options.webStorageKey, onChange: refresh})
    onCleanup(() => {
      events.removeEventListener(options.event, refresh)
      unsubscribe?.()
    })
  })
  return values
}
