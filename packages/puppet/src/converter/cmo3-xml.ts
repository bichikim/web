import type {Element} from '@xmldom/xmldom'

export const elementChildren = (element: Element | undefined): ReadonlyArray<Element> =>
  element === undefined
    ? []
    : Array.from(element.childNodes).filter((node): node is Element => node.nodeType === 1)

export const child = (
  element: Element | undefined,
  tag: string,
  name?: string,
): Element | undefined =>
  elementChildren(element).find(
    (candidate) =>
      candidate.tagName === tag && (name === undefined || candidate.getAttribute('xs.n') === name),
  )

export const field = (
  element: Element | undefined,
  tag: string,
  name: string,
): Element | undefined =>
  element === undefined
    ? undefined
    : Array.from(element.getElementsByTagName(tag)).find(
        (candidate) => candidate.getAttribute('xs.n') === name,
      )

export const resolve = (
  element: Element | undefined,
  references: ReadonlyMap<string, Element>,
): Element | undefined => {
  const reference = element?.getAttribute('xs.ref')
  if (reference === null || reference === undefined) {
    return element
  }
  const resolved = references.get(reference)
  if (resolved === undefined) {
    throw new Error(`CMO3 reference is missing: ${reference}`)
  }
  return resolved
}

export const guid = (
  element: Element | undefined,
  references: ReadonlyMap<string, Element>,
): string | undefined => resolve(element, references)?.getAttribute('uuid') ?? undefined

export const scalar = (
  element: Element | undefined,
  references?: ReadonlyMap<string, Element>,
): number | undefined => {
  const resolved = references === undefined ? element : resolve(element, references)
  const value = Number(resolved?.textContent)
  return resolved === undefined || !Number.isFinite(value) ? undefined : value
}

export const numbers = (element: Element | undefined): ReadonlyArray<number> => {
  const text = element?.textContent?.trim() ?? ''
  if (text.length === 0) {
    return []
  }
  const values = text.split(/\s+/u).map(Number)
  if (!values.every(Number.isFinite)) {
    throw new Error('CMO3 coordinates must be finite numbers')
  }
  return values
}

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
