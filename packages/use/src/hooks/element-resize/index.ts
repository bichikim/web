import {Size} from '@winter-love/utils'
import {isElement} from 'src/checks/is-element'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'
import {watchEffect} from 'vue'

/**
 * 지정된 엘리먼트의 사이즈가 바뀌면 크기를 callback 호출 합니다
 * @param element
 * @param callback
 * @param isActive
 */
export const onElementResize = (
  element?: MaybeRef<HTMLElement | undefined | null>,
  callback?: (size: Size) => any | null | undefined,
  isActive: MaybeRef<boolean> = true,
) => {
  const elementRef = resolveRef(element)
  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver((entries: ResizeObserverEntry[]) => {
          if (entries.length === 0) {
            return
          }

          const {width, height} = entries[0].contentRect

          callback?.({height, width})
        })
  const isActiveRef = resolveRef(isActive)

  watchEffect((onCleanup) => {
    const element = elementRef.value

    if (isElement(element) && isActiveRef.value) {
      resizeObserver?.observe(element)
    }

    onCleanup(() => {
      resizeObserver?.disconnect()
    })
  })
}
