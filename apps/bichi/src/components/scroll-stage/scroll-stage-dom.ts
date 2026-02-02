export interface ScrollStageElements {
  scrollContentElement: HTMLElement
  lineElement: HTMLElement
}

export function getScrollStageElements(contentElement: HTMLElement): ScrollStageElements | null {
  const scrollContentElement = contentElement.querySelector<HTMLElement>('.scroll__content')
  const lineElement = contentElement.querySelector<HTMLElement>('.layout__line')

  if (!scrollContentElement || !lineElement) {
    return null
  }

  return {lineElement, scrollContentElement}
}

export function initializeLineElement(lineElement: HTMLElement): void {
  lineElement.style.transformOrigin = 'left'
}

export function applyScrollDomTransforms(
  elements: ScrollStageElements,
  scrollOffset: number,
  normalized: number,
): void {
  elements.scrollContentElement.style.transform = `translateY(${-scrollOffset}px)`
  elements.lineElement.style.transform = `scaleX(${normalized})`
}

export function setBodyHeight(height: number): void {
  document.body.style.height = `${height}px`
}

export function attachCanvasToBody(canvas: HTMLCanvasElement): void {
  document.body.insertBefore(canvas, document.body.firstChild)
}

export function removeCanvasFromBody(canvas: HTMLCanvasElement): void {
  if (canvas.parentNode) {
    canvas.remove()
  }
}
