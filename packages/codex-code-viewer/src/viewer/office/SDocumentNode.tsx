import {createMemo, For, type JSX} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import type {DocumentNode} from './types'

interface SDocumentNodeProps {
  node: DocumentNode
}
const classes = new Map<string, string>([
  ['p', 'my-3'],
  ['h1', 'my-5 text-2xl font-semibold'],
  ['h2', 'my-4 text-xl font-semibold'],
  ['h3', 'my-3 text-lg font-semibold'],
  ['h4', 'my-3 font-semibold'],
  ['h5', 'my-3 font-semibold'],
  ['h6', 'my-3 font-semibold'],
  ['ol', 'my-3 list-decimal pl-6'],
  ['li', 'my-1'],
  ['ul', 'my-3 list-disc pl-6'],
  ['table', 'my-4 w-full border-collapse text-sm'],
  ['a', 'text-accent underline underline-offset-2'],
  ['td', 'border border-divider px-3 py-2 align-top'],
  ['blockquote', 'my-3 border-l-2 border-divider pl-4 text-muted'],
  ['th', 'border border-divider bg-surface px-3 py-2 text-left font-medium'],
  ['hr', 'my-4 border-t border-divider'],
  ['img', 'my-3 max-w-full'],
])

const renderNode = (node: DocumentNode): JSX.Element => {
  switch (node.kind) {
    case 'text':
      return <>{node.text}</>
    case 'element':
      return (
        <Dynamic
          component={node.tag}
          class={classes.get(node.tag)}
          id={node.id}
          href={node.href}
          src={node.src}
          alt={node.alt}
          target={node.href !== undefined && !node.href.startsWith('#') ? '_blank' : undefined}
          rel={
            node.href !== undefined && !node.href.startsWith('#')
              ? 'noopener noreferrer'
              : undefined
          }
          colSpan={node.colspan}
          rowSpan={node.rowspan}
        >
          <For each={node.children}>{(child) => <SDocumentNode node={child} />}</For>
        </Dynamic>
      )
    default: {
      const unreachable: never = node
      return unreachable
    }
  }
}
export const SDocumentNode = (props: SDocumentNodeProps): JSX.Element => {
  const content = createMemo(() => renderNode(props.node))
  return <>{content()}</>
}
