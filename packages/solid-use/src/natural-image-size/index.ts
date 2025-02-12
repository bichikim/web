import {createMemo} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'

export interface NaturalImageLike {
  naturalHeight: number
  naturalWidth: number
}

export const naturalImageSize = (element: MaybeAccessor<NaturalImageLike | null>) => {
  const elementAccessor = resolveAccessor(element)

  return createMemo(() => {
    const element = elementAccessor()

    if (element) {
      const {naturalWidth, naturalHeight} = element

      return {height: naturalHeight, width: naturalWidth}
    }

    return {height: 0, width: 0}
  })
}
