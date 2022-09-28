export const getNativeElement = (selectors: string | HTMLElement): HTMLElement | null => {
  if (typeof selectors === 'string') {
    return document.querySelector(selectors)
  }
  return selectors
}
