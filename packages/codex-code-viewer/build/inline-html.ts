import {defaultTreeAdapter, type DefaultTreeAdapterTypes, parse, serialize} from 'parse5'
import {inlineScript} from './inline-script'

interface InlineHtmlOptions {
  entrypoint: string
  javascript: string
  stylesheet: string
  template: string
}

const readElements = (
  parent: DefaultTreeAdapterTypes.ParentNode,
): DefaultTreeAdapterTypes.Element[] =>
  parent.childNodes.flatMap((child) =>
    defaultTreeAdapter.isElementNode(child) ? [child, ...readElements(child)] : [],
  )

/** Inlines exactly one matching entry script and its stylesheet, or rejects the template. */
export const inlineHtml = (options: InlineHtmlOptions): string => {
  const document = parse(options.template)
  const elements = readElements(document)
  const head = elements.find((element) => element.tagName === 'head')
  const scripts = elements.filter(
    (element) =>
      element.tagName === 'script' &&
      element.attrs.some(({name, value}) => name === 'src' && value === options.entrypoint),
  )
  const [script] = scripts
  if (head === undefined || script === undefined || scripts.length !== 1) {
    throw new Error('Expected one viewer entry script')
  }
  script.attrs = [
    ...script.attrs.filter(({name}) => name !== 'src' && name !== 'type'),
    {name: 'type', value: 'module'},
  ]
  script.childNodes = []
  defaultTreeAdapter.insertText(script, inlineScript(options.javascript))
  const style = defaultTreeAdapter.createElement('style', head.namespaceURI, [])
  defaultTreeAdapter.insertText(style, options.stylesheet)
  defaultTreeAdapter.appendChild(head, style)
  return serialize(document)
}
