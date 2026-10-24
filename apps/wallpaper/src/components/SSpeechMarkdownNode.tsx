import {For, type JSX} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import type {Code, List, Nodes} from 'mdast'
import {SSpeechTable} from './SSpeechTable'

const children = (node: Nodes): JSX.Element =>
  'children' in node ? <For each={node.children}>{(child) => renderNode(child)}</For> : undefined

const SSpeechCode = (props: {readonly node: Code}) => (
  <pre
    role="region"
    aria-label={props.node.lang ? `${props.node.lang} 코드` : '코드 블록'}
    tabIndex={0}
    class="m-0 min-w-0 overflow-auto rounded-lg border border-solid border-stone-300/70 bg-white/55
    p-2 font-mono text-xs leading-5 [white-space:inherit] [overflow-wrap:inherit]"
  >
    <code>{props.node.value}</code>
  </pre>
)
const SSpeechList = (props: {readonly node: List}) => (
  <Dynamic
    component={props.node.ordered ? 'ol' : 'ul'}
    start={props.node.ordered ? (props.node.start ?? 1) : undefined}
    class="m-0 min-w-0 pl-5"
    classList={{'list-decimal': props.node.ordered === true, 'list-disc': !props.node.ordered}}
  >
    {children(props.node)}
  </Dynamic>
)
const renderFallback = (node: Nodes): JSX.Element => {
  switch (node.type) {
    case 'html':
    case 'yaml':
      return node.value
    case 'image':
    case 'imageReference':
      return node.alt ?? ''
    case 'definition':
    case 'footnoteDefinition':
      return null
    case 'footnoteReference':
      return `[${node.label ?? node.identifier}]`
    default:
      return children(node)
  }
}
const renderNode = (node: Nodes): JSX.Element => {
  switch (node.type) {
    case 'text':
      return node.value
    case 'inlineCode':
      return <code class="rounded bg-black/6 px-1 py-0.5 font-mono text-[.92em]">{node.value}</code>
    case 'strong':
      return <strong class="font-semibold">{children(node)}</strong>
    case 'emphasis':
      return <em>{children(node)}</em>
    case 'delete':
      return <del>{children(node)}</del>
    case 'paragraph':
      return <p class="m-0 min-w-0">{children(node)}</p>
    case 'heading':
      return (
        <Dynamic component={`h${node.depth}`} class="m-0 text-[14px] font-semibold leading-5">
          {children(node)}
        </Dynamic>
      )
    case 'code':
      return <SSpeechCode node={node} />
    case 'table':
      return <SSpeechTable node={node} />
    case 'list':
      return <SSpeechList node={node} />
    case 'listItem':
      return <li class="my-0.5 min-w-0">{children(node)}</li>
    case 'blockquote':
      return (
        <blockquote class="m-0 min-w-0 border-0 border-l-2 border-solid border-stone-300 pl-2 text-stone-600">
          {children(node)}
        </blockquote>
      )
    case 'break':
      return <br />
    case 'thematicBreak':
      return <hr class="m-0 border-0 border-t border-solid border-stone-300/70" />
    default:
      return renderFallback(node)
  }
}

/** Renders Markdown syntax as elements; raw HTML remains escaped text. */
export const SSpeechMarkdownNode = (props: {readonly node: Nodes}) => <>{renderNode(props.node)}</>
