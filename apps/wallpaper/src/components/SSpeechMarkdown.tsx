import {createMemo, For} from 'solid-js'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {gfm} from 'micromark-extension-gfm'
import {SSpeechMarkdownNode} from './SSpeechMarkdownNode'

interface SSpeechMarkdownProps {
  readonly source: string
  readonly wrap?: boolean
}
export const SSpeechMarkdown = (props: SSpeechMarkdownProps) => {
  const document = createMemo(() =>
    fromMarkdown(props.source, {extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()]}),
  )
  return (
    <div
      data-wrap={props.wrap ?? false}
      class="grid min-w-0 gap-2 whitespace-pre [overflow-wrap:normal]
      data-[wrap=true]:whitespace-pre-wrap data-[wrap=true]:[overflow-wrap:anywhere]"
    >
      <For each={document().children}>{(node) => <SSpeechMarkdownNode node={node} />}</For>
    </div>
  )
}
