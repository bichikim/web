import type {Element} from '@xmldom/xmldom'

export const elementChildren = (element: Element): ReadonlyArray<Element> =>
  Array.from(element.childNodes).filter((node): node is Element => node.nodeType === 1)

export const child = (element: Element, tag: string, name?: string): Element | undefined =>
  elementChildren(element).find(
    (candidate) =>
      candidate.tagName === tag && (name === undefined || candidate.getAttribute('xs.n') === name),
  )

export const field = (element: Element, tag: string, name: string): Element | undefined =>
  Array.from(element.getElementsByTagName(tag)).find(
    (candidate) => candidate.getAttribute('xs.n') === name,
  )

export const numbers = (element: Element | undefined): ReadonlyArray<number> => {
  const text = element?.textContent?.trim()
  return text === undefined || text.length === 0 ? [] : text.split(/\s+/u).map(Number)
}

export const scalar = (element: Element | undefined): number | undefined => {
  const value = Number(element?.textContent)
  return element === undefined || !Number.isFinite(value) ? undefined : value
}

export const resolve = (
  element: Element | undefined,
  references: ReadonlyMap<string, Element>,
): Element | undefined => {
  const reference = element?.getAttribute('xs.ref')
  return reference === null || reference === undefined ? element : references.get(reference)
}

export const guid = (
  element: Element | undefined,
  references: ReadonlyMap<string, Element>,
): string | undefined => resolve(element, references)?.getAttribute('uuid') ?? undefined

export const getSources = (
  model: Element,
  tag: string,
  references: ReadonlyMap<string, Element>,
): ReadonlyArray<Element> => {
  const set = child(model, tag)
  const list = set === undefined ? undefined : child(set, 'carray_list', '_sources')
  return list === undefined
    ? []
    : elementChildren(list).map((entry) => {
        const source = resolve(entry, references)
        if (source === undefined) {
          throw new Error(`CMO3 ${tag} source is missing`)
        }
        return source
      })
}
