/* eslint-disable @typescript-eslint/no-namespace */
import {Directive} from 'src/types'
import {Accessor, createRenderEffect, onCleanup} from 'solid-js'
import {useTargetElement} from 'src/use/target-element'

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      teleport: Accessor<HTMLElement | string | null>
    }
  }
}

export const teleport: Directive<HTMLElement | string | null> = (
  element,
  target: Accessor<HTMLElement | string | null>,
) => {
  const targetElement = useTargetElement(target)

  createRenderEffect(() => {
    const targetElementValue = targetElement()

    if (targetElementValue) {
      targetElementValue.append(element)
    }
  })

  onCleanup(() => {
    element.remove()
  })
}
