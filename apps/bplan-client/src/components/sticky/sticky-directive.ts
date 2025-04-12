/* eslint-disable @typescript-eslint/no-namespace */
import {Accessor, createRenderEffect} from 'solid-js'
import {Directive} from 'src/types'
import {useTargetElement} from 'src/use/target-element'

export interface StickyPosition {
  bottom?: number
  left?: number
  right?: number
  top?: number
}

export type StickyDirective = [
  Accessor<HTMLElement | string | null>,
  Accessor<StickyPosition>,
]

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      sticky: StickyDirective
    }
  }
}

export const sticky: Directive<StickyDirective> = (element, value) => {
  const [target, position] = value()
  const targetElement = useTargetElement(target)

  createRenderEffect(() => {
    const targetElementValue = targetElement()
    const positionValue = position()

    if (!targetElementValue) {
      return targetElementValue
    }

    const rect = targetElementValue.getBoundingClientRect()

    if (typeof positionValue.top === 'number') {
      element.style.top = `${rect.top + positionValue.top}px`
    }

    if (typeof positionValue.bottom === 'number') {
      element.style.bottom = `${rect.bottom - positionValue.bottom}px`
    }

    if (typeof positionValue.left === 'number') {
      element.style.left = `${rect.left + positionValue.left}px`
    }

    if (typeof positionValue.right === 'number') {
      element.style.right = `${rect.right - positionValue.right}px`
    }

    return targetElementValue
  })
}
