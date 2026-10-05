import {createSignal, onCleanup, onMount} from 'solid-js'
export interface CollectionChangeSignalOptions<Value> {
  readonly read: () => ReadonlyArray<Value>
  readonly event: string
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
    onCleanup(() => events.removeEventListener(options.event, refresh))
  })
  return values
}
