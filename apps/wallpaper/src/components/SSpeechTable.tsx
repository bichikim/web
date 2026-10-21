import {For} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import type {Table, TableRow} from 'mdast'
import {SSpeechMarkdownNode} from './SSpeechMarkdownNode'

interface SpeechTableRowProps {
  readonly row: TableRow
  readonly header?: boolean
  readonly align: Table['align']
}
const SSpeechTableRow = (props: SpeechTableRowProps) => (
  <tr>
    <For each={props.row.children}>
      {(cell, index) => (
        <Dynamic
          component={props.header ? 'th' : 'td'}
          scope={props.header ? 'col' : undefined}
          data-align={props.align?.[index()]}
          class="border border-solid border-stone-300/80 px-2 py-1.5 align-top
      data-[align=center]:text-center data-[align=right]:text-right"
        >
          <For each={cell.children}>{(child) => <SSpeechMarkdownNode node={child} />}</For>
        </Dynamic>
      )}
    </For>
  </tr>
)
export const SSpeechTable = (props: {readonly node: Table}) => (
  <div
    role="region"
    aria-label="표"
    tabIndex={0}
    class="min-w-0 max-w-full overflow-auto overscroll-contain rounded border border-solid
    border-stone-300/80 whitespace-pre [overflow-wrap:normal]
    focus-visible:outline-2 focus-visible:outline-blue-700
    [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb]:bg-stone-400/60"
  >
    <table class="w-max min-w-full border-collapse text-left text-xs leading-5">
      <thead class="bg-black/4">
        <For each={props.node.children.slice(0, 1)}>
          {(row) => <SSpeechTableRow row={row} align={props.node.align} header />}
        </For>
      </thead>
      <tbody>
        <For each={props.node.children.slice(1)}>
          {(row) => <SSpeechTableRow row={row} align={props.node.align} />}
        </For>
      </tbody>
    </table>
  </div>
)
