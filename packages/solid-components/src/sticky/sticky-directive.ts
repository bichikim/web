/* eslint-disable @typescript-eslint/no-namespace */
import {Accessor, createRenderEffect} from 'solid-js'
import {Directive} from '../types'
import {useTargetElement} from '@winter-love/solid-use'

export interface StickyPosition {
  bottom?: number
  left?: number
  right?: number
  top?: number
}

export type StickyDirective = [Accessor<HTMLElement | string | null>, Accessor<StickyPosition>]

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      sticky: StickyDirective
    }
  }
}

export const getStickyPosition = (element: HTMLElement, position: StickyPosition) => {
  const rect = element.getBoundingClientRect()

  const result: StickyPosition = {}

  if (typeof position.top === 'number') {
    result.top = rect.top + position.top
  }

  if (typeof position.bottom === 'number') {
    result.bottom = rect.bottom - position.bottom
  }

  if (typeof position.left === 'number') {
    result.left = rect.left + position.left
  }

  if (typeof position.right === 'number') {
    result.right = rect.right - position.right
  }

  return result
}

/**
 * WIP
 */
export const sticky: Directive<StickyDirective> = (element, value) => {
  const [target, position] = value()
  const targetElement = useTargetElement(target)

  createRenderEffect(() => {
    const targetElementValue = targetElement()
    const positionValue = position()

    if (!targetElementValue) {
      return targetElementValue
    }

    const stickyPosition = getStickyPosition(targetElementValue, positionValue)

    if (typeof stickyPosition.top === 'number') {
      element.style.top = `${stickyPosition.top}px`
    }

    if (typeof stickyPosition.bottom === 'number') {
      element.style.bottom = `${stickyPosition.bottom}px`
    }

    if (typeof stickyPosition.left === 'number') {
      element.style.left = `${stickyPosition.left}px`
    }

    if (typeof stickyPosition.right === 'number') {
      element.style.right = `${stickyPosition.right}px`
    }

    return targetElementValue
  })
}
