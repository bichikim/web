import {useTranslations} from './locale/use-translations'
import {For, Show} from 'solid-js'
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
  folding?: boolean
  foldEnd?: number
  collapsed?: boolean
  onToggleFold?: () => void
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
  'ui-code-gutter shrink-0 touch-none select-none bg-surface py-0 text-right text-muted',
  'outline-none hover:text-foreground aria-pressed:bg-selection aria-pressed:text-foreground',
  'focus-visible:font-semibold',
].join(' ')

export const SCodeLine = (props: SCodeLineProps) => {
  const t = useTranslations()
  const handleFold = (event: MouseEvent): void => {
    event.stopPropagation()
    props.onToggleFold?.()
  }
  return (
    <div
      class="flex min-h-6 data-[selected=true]:bg-selection"
      data-line={props.line}
      data-selected={props.selected}
    >
      <span
        class="sticky left-0 flex shrink-0 bg-surface data-[selected=true]:bg-selection"
        data-selected={props.selected}
      >
        <button
          aria-label={t('{line}줄 선택', {line: props.line})}
          aria-pressed={props.selected}
          class={numberClasses}
          data-line-number={props.line}
          disabled={!props.selectable}
          tabindex={props.focusable ? 0 : -1}
          type="button"
        >
          {props.line}
        </button>
        <Show when={props.folding} fallback={<span class="w-4" />}>
          <span class="flex w-6 shrink-0 items-start">
            <Show when={props.foldEnd !== undefined}>
              <button
                type="button"
                class="ui-code-fold"
                aria-expanded={!props.collapsed}
                aria-label={
                  props.collapsed
                    ? t('{line}줄 펼치기', {line: props.line})
                    : t('{line}줄 접기', {line: props.line})
                }
                onClick={handleFold}
              >
                {props.collapsed ? '›' : '⌄'}
              </button>
            </Show>
          </span>
        </Show>
      </span>
      <code class="block flex-1 pr-6">
        <For each={props.tokens}>
          {(token) =>
            token.navigation === null ? (
              <span class={tokenClasses[token.kind]} data-code-offset={token.offset}>
                <STokenText token={token} matches={props.matches} activeMatch={props.activeMatch} />
              </span>
            ) : (
              <a
                aria-label={`${token.navigation === 'path' ? t('파일로 이동') : t('정의·사용처 찾기')}: ${token.text}`}
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
        <Show when={props.collapsed}>
          <button
            type="button"
            class="mx-1 rounded bg-selection px-1 text-muted"
            aria-label={t('접힌 {count}줄 펼치기', {
              count: (props.foldEnd ?? props.line) - props.line,
            })}
            onClick={handleFold}
          >
            …
          </button>
        </Show>
      </code>
    </div>
  )
}
