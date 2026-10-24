import {createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'

export interface NaturalImageLike extends Partial<
  Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
> {
  naturalHeight: number
  naturalWidth: number
}

export const naturalImageSize = (element: MaybeAccessor<NaturalImageLike | null>) => {
  const elementAccessor = resolveAccessor(element)
  const [loadVersion, setLoadVersion] = createSignal(0)

  createEffect(() => {
    const image = elementAccessor()

    if (!image?.addEventListener || !image.removeEventListener) {
      return
    }

    const refresh = () => setLoadVersion((version) => version + 1)
    image.addEventListener('load', refresh)
    image.addEventListener('error', refresh)

    onCleanup(() => {
      image.removeEventListener?.('load', refresh)
      image.removeEventListener?.('error', refresh)
    })
  })

  return createMemo(() => {
    loadVersion()
    const element = elementAccessor()

    if (element) {
      const {naturalWidth, naturalHeight} = element

      return {height: naturalHeight, width: naturalWidth}
    }

    return {height: 0, width: 0}
  })
}
