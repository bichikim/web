import {createMemo, createSignal, For, type JSX, Show} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import type {
  Blockquote,
  Break,
  Code,
  Definition,
  Delete,
  Emphasis,
  FootnoteDefinition,
  FootnoteReference,
  Heading,
  Html,
  Image,
  ImageReference,
  InlineCode,
  Link,
  LinkReference,
  List,
  ListItem,
  Nodes,
  Paragraph,
  Root,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
  ThematicBreak,
} from 'mdast'
import type {CodeLocation} from '../shared/contracts'
import type {ViewerPort} from './types'
import {parseMarkdown} from './parse-markdown'
import {resolveDocumentLink} from './resolve-document-link'
import {useScrollRestoration} from './use-scroll-restoration'
import {SMarkdownImage} from './SMarkdownImage'

interface SMarkdownProps {
  source: string
  path: string
  port?: ViewerPort
  session?: string
  onOpen?: (location: CodeLocation) => void
}
interface MarkdownNodeProps extends SMarkdownProps {
  inlineParagraph?: boolean
  node: Nodes
  root: Root
}
const childrenText = (node: Nodes): string =>
  'value' in node ? node.value : 'children' in node ? node.children.map(childrenText).join('') : ''
interface MarkdownLinkProps extends MarkdownNodeProps {
  url: string
  children: JSX.Element
}
const SMarkdownLink = (props: MarkdownLinkProps) => {
  const local = () => resolveDocumentLink(props.path, props.url)
  const external = () => /^(?:https?:|mailto:)/iu.test(props.url)
  const handleClick = (event: MouseEvent): void => {
    const path = local()
    if (path !== undefined && props.onOpen !== undefined && !props.url.startsWith('#')) {
      event.preventDefault()
      props.onOpen({column: 1, line: 1, path: path.split('#')[0] ?? path})
    }
  }
  return (
    <Dynamic
      component={local() !== undefined || external() ? 'a' : 'span'}
      href={local() !== undefined || external() ? props.url : undefined}
      target={external() ? '_blank' : undefined}
      rel={external() ? 'noopener noreferrer' : undefined}
      class="text-accent underline underline-offset-2"
      onClick={handleClick}
    >
      {props.children}
    </Dynamic>
  )
}
type BlockNode = Paragraph | Heading | Code | Blockquote | List | ListItem | ThematicBreak
type InlineNode = Root | Text | Strong | Emphasis | Delete | InlineCode | Break | Link
type ReferenceNode =
  | Image
  | LinkReference
  | ImageReference
  | Table
  | TableRow
  | TableCell
  | Definition
  | FootnoteReference
  | FootnoteDefinition
  | Html
interface InlineProps extends MarkdownNodeProps {
  node: Exclude<Nodes, BlockNode>
}
interface ReferenceProps extends MarkdownNodeProps {
  node: Exclude<Nodes, BlockNode | InlineNode>
}
interface MdxProps extends MarkdownNodeProps {
  node: Exclude<Nodes, BlockNode | InlineNode | ReferenceNode>
}
const renderChildren = (options: MarkdownNodeProps, inlineFirst = false) =>
  'children' in options.node ? (
    <For each={options.node.children}>
      {(node, index) => (
        <SMarkdownNode {...options} node={node} inlineParagraph={inlineFirst && index() === 0} />
      )}
    </For>
  ) : undefined
const renderBlock = (options: MarkdownNodeProps): JSX.Element => {
  const {node} = options
  const children = () => renderChildren(options)
  switch (node.type) {
    case 'paragraph':
      return <p class={options.inlineParagraph ? 'm-0 inline' : 'my-3'}>{children()}</p>
    case 'heading':
      return (
        <Dynamic
          component={`h${node.depth}`}
          id={childrenText(node).toLowerCase().replace(/\s+/gu, '-')}
          class={
            node.depth === 1
              ? 'my-5 text-2xl font-semibold'
              : node.depth === 2
                ? 'my-4 text-xl font-semibold'
                : 'my-3 text-lg font-semibold'
          }
        >
          {children()}
        </Dynamic>
      )
    case 'code':
      return (
        <pre class="my-3 overflow-auto rounded-xl border border-divider bg-surface p-3 font-mono text-xs leading-6">
          <code>{node.value}</code>
        </pre>
      )
    case 'blockquote':
      return (
        <blockquote class="mx-0 my-3 border-l-3 border-divider pl-4 text-muted">
          {children()}
        </blockquote>
      )
    case 'list':
      return (
        <Dynamic
          component={node.ordered ? 'ol' : 'ul'}
          start={node.ordered ? (node.start ?? undefined) : undefined}
          class="my-3 pl-6"
        >
          {children()}
        </Dynamic>
      )
    case 'listItem':
      return (
        <li class="my-1">
          {node.checked !== null && node.checked !== undefined ? (
            <input
              aria-label={childrenText(node)}
              type="checkbox"
              checked={node.checked}
              disabled
              class="mr-2 [appearance:auto]"
            />
          ) : undefined}
          {renderChildren(options, true)}
        </li>
      )
    case 'thematicBreak':
      return <hr class="my-5 border-t border-divider" />
    default:
      return renderInline({...options, node})
  }
}
const renderInline = (options: InlineProps): JSX.Element => {
  const {node} = options
  const children = () => renderChildren(options)
  switch (node.type) {
    case 'root':
      return <>{children()}</>
    case 'text':
      return <>{node.value}</>
    case 'strong':
      return <strong>{children()}</strong>
    case 'emphasis':
      return <em>{children()}</em>
    case 'delete':
      return <del>{children()}</del>
    case 'inlineCode':
      return <code class="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]">{node.value}</code>
    case 'break':
      return <br />
    case 'link':
      return (
        <SMarkdownLink {...options} url={node.url}>
          {children()}
        </SMarkdownLink>
      )
    default:
      return renderReference({...options, node})
  }
}
interface MarkdownPictureProps extends MarkdownNodeProps {
  image: Image
}
const SMarkdownPicture = (props: MarkdownPictureProps) => {
  const path = () => resolveDocumentLink(props.path, props.image.url)
  return (
    <Show
      when={path()}
      fallback={
        <SMarkdownLink {...props} url={props.image.url}>
          {props.image.alt ?? props.image.url}
        </SMarkdownLink>
      }
    >
      {(path) => (
        <SMarkdownImage
          path={path().split('#')[0] ?? path()}
          alt={props.image.alt ?? ''}
          port={props.port}
          session={props.session}
        />
      )}
    </Show>
  )
}
const renderReference = (options: ReferenceProps): JSX.Element => {
  const {node} = options
  const children = () => renderChildren(options)
  switch (node.type) {
    case 'image':
      return <SMarkdownPicture {...options} image={node} />
    case 'linkReference': {
      const reference = options.root.children.find(
        (child) => child.type === 'definition' && child.identifier === node.identifier,
      )
      return reference?.type === 'definition' ? (
        <SMarkdownLink {...options} url={reference.url}>
          {children()}
        </SMarkdownLink>
      ) : (
        <>{children()}</>
      )
    }
    case 'imageReference': {
      const reference = options.root.children.find(
        (child) => child.type === 'definition' && child.identifier === node.identifier,
      )
      return reference?.type === 'definition' ? (
        <SMarkdownNode {...options} node={{alt: node.alt, type: 'image', url: reference.url}} />
      ) : (
        <>{node.alt}</>
      )
    }
    case 'table':
      return (
        <div class="my-3 overflow-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr>
                <For each={node.children[0]?.children}>
                  {(cell) => (
                    <th
                      scope="col"
                      class="border border-divider bg-surface px-3 py-2 font-semibold"
                    >
                      {renderChildren({...options, node: cell})}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={node.children.slice(1)}>
                {(row) => <SMarkdownNode {...options} node={row} />}
              </For>
            </tbody>
          </table>
        </div>
      )
    case 'tableRow':
      return <tr>{children()}</tr>
    case 'tableCell':
      return <td class="border border-divider px-3 py-2">{children()}</td>
    case 'definition':
      return undefined
    case 'footnoteReference':
      return <sup>[{node.label ?? node.identifier}]</sup>
    case 'footnoteDefinition':
      return (
        <div class="my-3 border-t border-divider text-sm text-muted">
          [{node.label ?? node.identifier}]{children()}
        </div>
      )
    case 'html':
      return <code class="whitespace-pre-wrap font-mono text-xs text-muted">{node.value}</code>
    default:
      return renderMdx({...options, node})
  }
}
const renderMdx = (options: MdxProps): JSX.Element => {
  const {node} = options
  const children = () => renderChildren(options)
  switch (node.type) {
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return (
        <Dynamic component={node.type === 'mdxJsxTextElement' ? 'span' : 'div'} class="my-2">
          <code class="font-mono text-xs text-muted">{`<${node.name ?? ''}>`}</code>
          {children()}
          <code class="font-mono text-xs text-muted">{`</${node.name ?? ''}>`}</code>
        </Dynamic>
      )
    case 'yaml':
      return <code class="whitespace-pre-wrap font-mono text-xs text-muted">{node.value}</code>
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
    case 'mdxjsEsm':
      return (
        <code class="whitespace-pre-wrap font-mono text-xs text-muted">
          {options.source.slice(node.position?.start.offset ?? 0, node.position?.end.offset ?? 0)}
        </code>
      )
    default: {
      const unreachable: never = node
      return unreachable
    }
  }
}
const SMarkdownNode = (props: MarkdownNodeProps): JSX.Element => {
  const content = createMemo(() => renderBlock(props))
  return <>{content()}</>
}
export const SMarkdown = (props: SMarkdownProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const scroll = useScrollRestoration({content: () => props.source, element, kind: 'previewScroll'})
  const root = createMemo(() => parseMarkdown(props.source, props.path))
  return (
    <article
      aria-label="Markdown 미리보기"
      ref={setElement}
      onScroll={scroll.record}
      class="min-h-0 flex-1 overflow-auto px-6 py-3 text-sm leading-7"
    >
      <div class="mx-auto max-w-3xl">
        <SMarkdownNode {...props} node={root()} root={root()} />
      </div>
    </article>
  )
}
