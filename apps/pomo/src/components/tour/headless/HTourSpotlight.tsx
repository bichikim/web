import {type Accessor, createEffect, createSignal, type JSX, onCleanup} from 'solid-js'

import type {TourTargetBounds} from './types'

export interface HTourSpotlightProps {
  readonly children: (targetBounds: Accessor<TourTargetBounds | null>) => JSX.Element
  readonly element?: Element | null
  readonly padding?: number
}

const resolveTargetBounds = (element: Element, padding: number): TourTargetBounds | null => {
  const rectangle = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const left = Math.max(0, Math.min(viewportWidth, rectangle.left - padding))
  const right = Math.max(0, Math.min(viewportWidth, rectangle.right + padding))
  const top = Math.max(0, Math.min(viewportHeight, rectangle.top - padding))
  const bottom = Math.max(0, Math.min(viewportHeight, rectangle.bottom + padding))

  if (right <= left || bottom <= top) {
    return null
  }

  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    viewportHeight,
    viewportWidth,
    width: right - left,
  }
}

/** 활성 대상의 가시 영역을 측정하고 스크롤 및 크기 변화에 맞춰 갱신합니다. */
export const HTourSpotlight = (props: HTourSpotlightProps) => {
  const [targetBounds, setTargetBounds] = createSignal<TourTargetBounds | null>(null)

  createEffect(() => {
    // oxlint-disable-next-line eslint/prefer-destructuring -- Solid props require reactive property access.
    const element = props.element
    const padding = Math.max(0, props.padding ?? 0)

    if (element === null || element === undefined) {
      setTargetBounds(null)
      return
    }

    const updateBounds = () => setTargetBounds(resolveTargetBounds(element, padding))
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateBounds)

    updateBounds()
    resizeObserver?.observe(element)
    window.addEventListener('resize', updateBounds)
    window.addEventListener('scroll', updateBounds, true)

    onCleanup(() => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateBounds)
      window.removeEventListener('scroll', updateBounds, true)
    })
  })

  return <>{props.children(targetBounds)}</>
}
