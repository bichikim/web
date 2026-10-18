import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {replaceBlobObjectUrl} from 'src/features/blob-object-url'

/**
 * Owns one client-side URL per Blob identity until replacement, clearing, or owner disposal.
 * Returns undefined before client effects run and while empty; URL failures propagate.
 */
export const useObjectUrl = (
  source: Accessor<Blob | null | undefined>,
): Accessor<string | undefined> => {
  const blob = createMemo(() => source() ?? null)
  const [objectUrl, setObjectUrl] = createSignal<string | null>(null)

  createEffect(() => {
    const current = blob()
    if (current === null) {
      return
    }

    const url = replaceBlobObjectUrl(null, () => current)
    onCleanup(() => {
      setObjectUrl(null)
      replaceBlobObjectUrl(url, () => null)
    })
    setObjectUrl(url)
  })

  return () => objectUrl() ?? undefined
}
