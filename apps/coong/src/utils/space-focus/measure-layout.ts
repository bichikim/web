import {Rect} from './focus-store'

export const measureLayout = (element: HTMLElement | null): Rect | null => {
  if (!element) {
    return null
  }

  // offset 기반 측정 (transform 영향 X, 레이아웃 기준)
  let x = 0
  let y = 0
  let el: HTMLElement | null = element

  // offsetParent 체인을 타고 올라가면서 위치 누적
  while (el) {
    x += el.offsetLeft - el.scrollLeft
    y += el.offsetTop - el.scrollTop
    el = el.offsetParent as HTMLElement | null
  }

  const width = element.offsetWidth
  const height = element.offsetHeight

  return {
    bottom: y + height,
    cx: x + width / 2,
    cy: y + height / 2,
    left: x,
    right: x + width,
    top: y,
  }
}

export const measureLayoutBoundingClientRect = (element: HTMLElement | null): Rect | null => {
  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()

  return {
    bottom: rect.bottom,
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    left: rect.left,
    right: rect.right,
    top: rect.top,
  }
}
