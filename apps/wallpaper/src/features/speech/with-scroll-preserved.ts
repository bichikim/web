interface WithScrollPreservedOptions {
  readonly element: HTMLElement | null
  readonly change: () => void
}

/** Preserves descendant scroll offsets across a synchronous DOM change. */
export const withScrollPreserved = (options: WithScrollPreservedOptions) => {
  const scrolled = Array.from(options.element?.querySelectorAll<HTMLElement>('*') ?? [])
    .filter((element) => element.scrollTop !== 0 || element.scrollLeft !== 0)
    .map((element) => ({element, left: element.scrollLeft, top: element.scrollTop}))
  try {
    options.change()
  } finally {
    for (const {element, left, top} of scrolled) {
      element.scrollLeft = left
      element.scrollTop = top
    }
  }
}
