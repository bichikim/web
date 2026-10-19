import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'

interface UseMediaUrlProps {
  readonly id: Accessor<string | null>
  readonly load: (id: string) => Promise<Blob>
}
interface MediaUrlState {
  readonly url: Accessor<string | null>
  readonly failed: Accessor<boolean>
}

/** Owns a preview Blob URL until its media ID changes or its consumer unmounts. */
export const useMediaUrl = (props: UseMediaUrlProps): MediaUrlState => {
  const id = createMemo(props.id)
  const [url, setUrl] = createSignal<string | null>(null)
  const [failed, setFailed] = createSignal(false)
  createEffect(() => {
    const current = id()
    setUrl(null)
    setFailed(false)
    if (current === null) {
      return
    }
    let disposed = false
    let owned: string | null = null
    untrack(() => props.load(current))
      .then((blob) => {
        if (!disposed) {
          owned = URL.createObjectURL(blob)
          setUrl(owned)
        }
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true)
        }
      })
    onCleanup(() => {
      disposed = true
      if (owned !== null) {
        URL.revokeObjectURL(owned)
      }
    })
  })
  return {failed, url}
}
