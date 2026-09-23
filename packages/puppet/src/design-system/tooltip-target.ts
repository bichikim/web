interface TooltipTargetOptions {
  readonly element: HTMLElement
  readonly id: string
  readonly anchor: string
  readonly supported: boolean
}

export const readTooltipLabel = (element: HTMLElement) =>
  element.getAttribute('data-tooltip')?.trim() ||
  element.getAttribute('title')?.trim() ||
  element.getAttribute('aria-label')?.trim() ||
  ''

export const connectTooltipTarget = (options: TooltipTargetOptions) => {
  const {element, id, anchor, supported} = options
  const title = element.getAttribute('title')
  const description = element.getAttribute('aria-describedby')
  const previous = element.style.getPropertyValue('--editor-tooltip-anchor')
  const marker = element.getAttribute('data-tooltip-active')
  if (supported) {
    element.removeAttribute('title')
    element.setAttribute('aria-describedby', [description, id].filter(Boolean).join(' '))
    element.setAttribute('data-tooltip-active', '')
    element.style.setProperty('--editor-tooltip-anchor', anchor)
  } else {
    element.setAttribute('title', readTooltipLabel(element))
  }
  return () => {
    if (title === null) {
      element.removeAttribute('title')
    } else {
      element.setAttribute('title', title)
    }
    if (description === null) {
      element.removeAttribute('aria-describedby')
    } else {
      element.setAttribute('aria-describedby', description)
    }
    if (marker === null) {
      element.removeAttribute('data-tooltip-active')
    } else {
      element.setAttribute('data-tooltip-active', marker)
    }
    if (previous === '') {
      element.style.removeProperty('--editor-tooltip-anchor')
    } else {
      element.style.setProperty('--editor-tooltip-anchor', previous)
    }
  }
}
