import {useTranslations} from './locale/use-translations'
import {createMemo, createSignal, Show} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import type {ContextMenuCloseOptions, ReferenceChoices} from './types'
import {SContextMenu} from './SContextMenu'
import {SReferenceList} from './SReferenceList'

const RESULT_WIDTH = 480

interface SReferenceChoicesProps {
  readonly references: ReferenceChoices
  readonly previewLines?: number
  readonly onOpen?: (location: CodeLocation) => void
  readonly onClose?: () => void
}
/** Displays reference destinations beside the selected symbol with bounded scrolling. */
export const SReferenceChoices = (props: SReferenceChoicesProps) => {
  const t = useTranslations()
  const [closed, setClosed] = createSignal(false)
  const [filter, setFilter] = createSignal('')
  const query = createMemo(() => filter().trim().toLocaleLowerCase())
  const filtered = createMemo<Pick<ReferenceChoices, 'groups' | 'locations'>>(() => {
    const value = query()
    if (value === '') {
      return {groups: props.references.groups, locations: props.references.locations}
    }
    const matches = (path: string): boolean =>
      (path.split(/[\\/]/u).at(-1) ?? '').toLocaleLowerCase().includes(value)
    return {
      groups: props.references.groups?.filter((group) => matches(group.path)),
      locations: props.references.locations.filter((location) => matches(location.path)),
    }
  })
  const resolving = createMemo(() => props.references.status === 'resolving')
  const searching = createMemo(() => resolving() || props.references.status === 'searching')
  const count = createMemo(() => {
    const references = filtered()
    return references.groups === undefined
      ? references.locations.length
      : references.groups.reduce((total, group) => total + group.count, 0)
  })
  const title = createMemo(() =>
    resolving()
      ? t('위치 확인')
      : props.references.kind === 'definition'
        ? t('정의 위치')
        : t('사용처'),
  )
  const statusLabel = createMemo(() =>
    resolving() ? t('위치 확인 중') : t('{title} 검색 중', {title: title()}),
  )
  const returnFocus = globalThis.document?.activeElement
  const close = (options?: ContextMenuCloseOptions): void => {
    setClosed(true)
    props.onClose?.()
    if (options?.restoreFocus !== false && returnFocus instanceof HTMLElement) {
      returnFocus.focus({preventScroll: true})
    }
  }
  const select = (location: CodeLocation): void => {
    close()
    props.onOpen?.(location)
  }
  return (
    <Show when={!closed()}>
      <SContextMenu
        x={props.references.point.x}
        y={props.references.point.y}
        label={title()}
        title={
          <span class="flex min-w-0 items-center gap-3">
            <span class="flex min-w-0 flex-1 items-center gap-1">
              <span class="min-w-0 truncate" title={props.references.label}>
                {props.references.label}
              </span>
              <span class="shrink-0">·</span>
              <Show when={searching()}>
                <span
                  role="status"
                  aria-label={statusLabel()}
                  class="inline-flex shrink-0 align-middle"
                >
                  <span
                    aria-hidden="true"
                    class="i-tabler-loader-2 h-3 w-3 animate-spin motion-reduce:animate-none"
                  />
                </span>
              </Show>
              <span class="shrink-0">
                <Show
                  when={resolving()}
                  fallback={t('{title} {count}개', {
                    count: count(),
                    title: title(),
                  })}
                >
                  {t('위치 확인 중')}
                </Show>
              </span>
            </span>
            <input
              aria-label={t('파일 필터링')}
              class="ui-input ui-focus h-7 w-32 min-w-0 max-w-[40%] shrink-0 px-2 py-1 text-xs font-normal"
              placeholder={t('파일 필터링…')}
              value={filter()}
              onInput={(event) => setFilter(event.currentTarget.value)}
            />
          </span>
        }
        emptyMessage={
          props.references.status === 'failed'
            ? t('검색이 중단됐습니다. 찾은 {title}는 계속 확인할 수 있습니다.', {title: title()})
            : query() !== '' && count() === 0
              ? t('일치하는 파일이 없습니다.')
              : searching()
                ? undefined
                : count() === 0
                  ? t('작업 폴더 안에서 {title}를 찾지 못했습니다.', {title: title()})
                  : undefined
        }
        maxHeight={320}
        width={RESULT_WIDTH}
        items={[]}
        onClose={close}
      >
        <SReferenceList
          filter={query()}
          groups={filtered().groups}
          locations={filtered().locations}
          onSelect={select}
          previewLines={props.previewLines}
        />
      </SContextMenu>
    </Show>
  )
}
