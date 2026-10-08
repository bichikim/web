import {type DefaultTreeAdapterMap, parseFragment} from 'parse5'
import type {DocumentNode} from './types'

const TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'u',
  's',
  'sup',
  'sub',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'a',
  'img',
  'br',
  'hr',
  'blockquote',
])
const OMIT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template'])
const linkUrl = (value: string | undefined): string | undefined =>
  value !== undefined && /^(?:https?:\/\/|mailto:|#)[^\s]*$/iu.test(value) ? value : undefined
const imageUrl = (value: string | undefined): string | undefined =>
  value !== undefined &&
  /^data:image\/(?:png|jpeg|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/iu.test(value)
    ? value
    : undefined
const spanSize = (value: string | undefined): number | undefined =>
  value !== undefined && /^\d{1,3}$/u.test(value) && Number(value) > 0 ? Number(value) : undefined

const documentNodes = (node: DefaultTreeAdapterMap['childNode']): DocumentNode[] => {
  if (node.nodeName === '#text' && 'value' in node) {
    return [{kind: 'text', text: node.value}]
  }
  if (!('tagName' in node) || OMIT.has(node.tagName)) {
    return []
  }
  const children = node.childNodes.flatMap(documentNodes)
  if (!TAGS.has(node.tagName)) {
    return children
  }
  const attributes = Object.fromEntries(node.attrs.map(({name, value}) => [name, value]))
  const src = node.tagName === 'img' ? imageUrl(attributes.src) : undefined
  if (node.tagName === 'img' && src === undefined) {
    return []
  }
  return [
    {
      children,
      kind: 'element',
      tag: node.tagName,
      ...(attributes.id === undefined ? {} : {id: `word-${attributes.id}`}),
      ...(node.tagName === 'a' && linkUrl(attributes.href) !== undefined
        ? {
            href: attributes.href.startsWith('#')
              ? `#word-${attributes.href.slice(1)}`
              : attributes.href,
          }
        : {}),
      ...(src === undefined ? {} : {alt: attributes.alt ?? '문서 이미지', src}),
      ...(spanSize(attributes.colspan) === undefined
        ? {}
        : {colspan: spanSize(attributes.colspan)}),
      ...(spanSize(attributes.rowspan) === undefined
        ? {}
        : {rowspan: spanSize(attributes.rowspan)}),
    },
  ]
}

/** Keeps document semantics and embedded raster images, discarding active content and styles. */
export const parseDocumentHtml = (html: string): readonly DocumentNode[] =>
  parseFragment(html).childNodes.flatMap(documentNodes)
