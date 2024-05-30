import {resolveAccessor} from 'src/use/resolve-accessor'
import {Accessor, createMemo, createSignal} from 'solid-js'
import {MayBeAccessor} from 'src/use/types'
import {getWindow} from '@winter-love/utils'
import {useEvent} from 'src/use/event'
import {toggleValue} from 'src/use/toggle-value'

export const useTouch = (
  element: MayBeAccessor<HTMLElement | null>,
): Accessor<boolean> => {
  const getElement = resolveAccessor(element)
  const [downIdentifier, setDownIdentifier] = createSignal(-1)
  const isDown = createMemo(() => downIdentifier() !== -1)

  useEvent(toggleValue(getWindow, isDown, null), 'touchend', (event: TouchEvent) => {
    const touches = event.changedTouches
    const touchesLength = touches.length
    for (let index = 0; index < touchesLength; index += 1) {
      const touch = touches[index]
      if (touch.identifier === downIdentifier()) {
        setDownIdentifier(-1)
        return
      }
    }
  })

  useEvent(getElement, 'touchstart', (event: TouchEvent) => {
    const touches = event.changedTouches
    for (const touch of touches) {
      if (touch.target === getElement()) {
        setDownIdentifier(touch.identifier)
        return
      }
    }
  })

  useEvent(toggleValue(getWindow, isDown, null), 'touchmove', (event: TouchEvent) => {
    console.log(event.composedPath())
  })

  return isDown
}
