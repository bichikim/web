import {createMemo} from 'solid-js'
import {resolveAccessor} from 'src/use/resolve-accessor'
import {MayBeAccessor} from 'src/use/types'

export const naturalImageSize = (
  element: MayBeAccessor<HTMLImageElement | undefined>,
) => {
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
