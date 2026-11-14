const getStyleAncestors = (element: Element): ReadonlyArray<Element> => {
  const root = element.getRootNode()
  const parent = element.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
  return parent === null ? [element] : [element, ...getStyleAncestors(parent)]
}

interface ObserveInheritedStyleOptions {
  readonly element: Element
  readonly properties: ReadonlyArray<string>
  readonly onChange: () => void
}

/** Ignores unrelated style changes such as camera panning; includes embedded host themes. */
export const observeInheritedStyle = (options: ObserveInheritedStyleOptions) => {
  const readValues = () => {
    const style = getComputedStyle(options.element)
    return options.properties.map((property) => style.getPropertyValue(property))
  }
  let previous = readValues()
  const observer = new MutationObserver(() => {
    const next = readValues()
    if (next.some((value, index) => value !== previous[index])) {
      previous = next
      options.onChange()
    }
  })
  for (const ancestor of getStyleAncestors(options.element)) {
    observer.observe(ancestor, {attributeFilter: ['class', 'style'], attributes: true})
  }
  return () => observer.disconnect()
}
