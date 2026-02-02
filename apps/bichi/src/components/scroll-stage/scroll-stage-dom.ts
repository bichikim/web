export interface ScrollStageElements {
  lineElement: HTMLElement
  scrollContentElement: HTMLElement
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

const DEFAULT_STAGE_TITLE = 'hello world!'
const SECTION_TITLE_SELECTOR = '.section__title-text'

/**
 * Returns the title of the section whose center is closest to the viewport center.
 * Used to drive the 3D text behind the glass (About, Work, Contact, etc.).
 */
export function getCenteredSectionTitle(scrollContentElement: HTMLElement): string {
  const sections = scrollContentElement.querySelectorAll<HTMLElement>('.section')

  if (sections.length === 0) {
    return DEFAULT_STAGE_TITLE
  }

  const viewportCenter = window.innerHeight / 2
  let closestTitle = DEFAULT_STAGE_TITLE
  let closestDistance = Number.POSITIVE_INFINITY

  for (const section of sections) {
    const titleEl = section.querySelector<HTMLElement>(SECTION_TITLE_SELECTOR)

    if (!titleEl) {
      continue
    }

    const rect = titleEl.getBoundingClientRect()
    const sectionCenter = rect.top + rect.height / 2
    const distance = Math.abs(sectionCenter - viewportCenter)

    if (distance < closestDistance) {
      closestDistance = distance
      closestTitle =
      (titleEl.dataset.sectionTitle ?? (titleEl.textContent ?? '').trim()) || DEFAULT_STAGE_TITLE
    }
  }

  return closestTitle
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
