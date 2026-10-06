import {createEffect, createSignal, For, Show} from 'solid-js'

interface SFileResultsProps {
  files: string[]
  onChoose: (path: string) => void
  activeIndex?: number
  pending?: boolean
}

const handleMouseDown = (event: MouseEvent): void => {
  event.preventDefault()
}

export const SFileResults = (props: SFileResultsProps) => {
  const [list, setList] = createSignal<HTMLUListElement | null>(null)
  createEffect(() => {
    const index = props.activeIndex ?? -1
    list()?.querySelector(`[id="file-result-${index}"]`)?.scrollIntoView({block: 'nearest'})
  })
  return (
    <section class="max-h-[min(16rem,calc(100dvh-96px))] overflow-auto p-2">
      <ul
        aria-label="파일 검색 결과"
        class="m-0 list-none p-0"
        id="file-results"
        ref={setList}
        role="listbox"
      >
        <Show when={!props.pending}>
          <For each={props.files}>
            {(path, index) => (
              <li role="none">
                <button
                  aria-selected={props.activeIndex === index()}
                  class="ui-row w-full break-all rounded-row bg-transparent px-3 py-2 text-left
                    font-mono text-xs leading-5 aria-selected:bg-hover aria-selected:text-foreground"
                  id={`file-result-${index()}`}
                  onClick={() => props.onChoose(path)}
                  onMouseDown={handleMouseDown}
                  role="option"
                  tabindex="-1"
                  type="button"
                >
                  {path}
                </button>
              </li>
            )}
          </For>
        </Show>
      </ul>
      <Show when={props.pending || props.files.length === 0}>
        <p class="m-0 px-3 py-2 text-xs text-muted" role="status">
          {props.pending ? '파일을 찾는 중…' : '일치하는 파일이 없습니다.'}
        </p>
      </Show>
    </section>
  )
}
