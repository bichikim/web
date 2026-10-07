import {For} from 'solid-js'
import type {CodeToken} from '../shared/contracts'
import type {TextMatch} from './find-text'
import {STokenText} from './STokenText'

interface SCodeLineProps {
  line: number
  tokens: CodeToken[]
  selected?: boolean
  selectable?: boolean
  focusable?: boolean
  matches?: readonly TextMatch[]
  activeMatch?: number
}

const linkClasses = [
  'cursor-pointer select-text no-underline decoration-accent decoration-dotted underline-offset-4 hover:underline',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
].join(' ')

const tokenClasses = {
  comment: 'text-comment',
  identifier: 'text-inherit',
  keyword: 'text-keyword',
  number: 'text-number',
  plain: 'text-inherit',
  string: 'text-string',
}

const numberClasses = [
  'sticky left-0 mr-4 w-12 shrink-0 touch-none select-none bg-surface p-0 pr-3 text-right text-muted',
  'outline-none hover:text-foreground aria-pressed:bg-selection aria-pressed:text-foreground',
  'focus-visible:font-semibold',
].join(' ')

export const SCodeLine = (props: SCodeLineProps) => (
  <div
    class="flex min-h-6 data-[selected=true]:bg-selection"
    data-line={props.line}
    data-selected={props.selected}
  >
    <button
      aria-label={`${props.line}줄 선택`}
      aria-pressed={props.selected}
      class={numberClasses}
      data-line-number={props.line}
      disabled={!props.selectable}
      tabindex={props.focusable ? 0 : -1}
      type="button"
    >
      {props.line}
    </button>
    <code class="block flex-1 pr-6">
      <For each={props.tokens}>
        {(token) =>
          token.navigation === null ? (
            <span class={tokenClasses[token.kind]} data-code-offset={token.offset}>
              <STokenText token={token} matches={props.matches} activeMatch={props.activeMatch} />
            </span>
          ) : (
            <a
              aria-label={`${token.navigation === 'path' ? '파일' : '정의'}로 이동: ${token.text}`}
              class={`${tokenClasses[token.kind]} ${linkClasses}`}
              data-code-offset={token.offset}
              data-offset={token.offset}
              draggable={false}
              href="#"
            >
              <STokenText token={token} matches={props.matches} activeMatch={props.activeMatch} />
            </a>
          )
        }
      </For>
    </code>
  </div>
)
