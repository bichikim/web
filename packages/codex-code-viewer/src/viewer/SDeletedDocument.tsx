import {createMemo, Show} from 'solid-js'
import type {DeletedDocument} from './types'
import type {TextMatch} from './find-text'
import {SCodeEditor} from './editor/SCodeEditor'
import {SDeletedOriginal} from './SDeletedOriginal'
import {ViewStateContext} from './view-state/context'
import {useTranslations} from './locale/use-translations'

interface SDeletedDocumentProps {
  readonly draftSource?: string
  readonly saving?: boolean
  readonly editing?: boolean
  readonly onToggleEditing?: () => void
  readonly onChange?: (source: string) => void
  readonly onSave?: () => void
  readonly document: DeletedDocument
  readonly pending?: boolean
  readonly matches?: readonly TextMatch[]
  readonly activeMatch?: number
  readonly searchScrollRequest?: number
  readonly onClose?: () => void
  readonly onFind?: (text?: string) => void
  readonly onError?: (error: unknown) => void
}
const partitionMatches = (matches: readonly TextMatch[], boundary: number) => ({
  draft: matches
    .filter((match) => match.start >= boundary)
    .map((match) => ({end: match.end - boundary, start: match.start - boundary})),
  original: matches.filter((match) => match.end < boundary),
})

export const SDeletedDocument = (props: SDeletedDocumentProps) => {
  const t = useTranslations()
  const boundary = () =>
    props.onChange === undefined ? Infinity : (props.document.source ?? '').length + 1
  const matches = createMemo(() => partitionMatches(props.matches ?? [], boundary()))
  const originalActive = () =>
    (props.activeMatch ?? -1) < matches().original.length ? (props.activeMatch ?? -1) : -1
  const draftActive = () => (props.activeMatch ?? -1) - matches().original.length
  const handleSave = (): void => {
    if (props.editing) {
      props.onSave?.()
    }
  }
  const handleToggleEditing = (): void => props.onToggleEditing?.()
  return (
    <>
      <header class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-2 text-sm">
        <span class="min-w-0 flex-1 truncate" title={props.document.path}>
          {props.document.path}
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-pill bg-change-deleted-muted
          px-2 py-1 text-xs text-change-deleted"
        >
          <span aria-hidden="true" class="i-tabler-file-minus" />
          {t('삭제된 파일')}
        </span>
        <Show when={props.onChange === undefined}>
          <span class="text-xs text-muted">{t('읽기 전용')}</span>
        </Show>
        <Show when={props.editing && props.onSave !== undefined}>
          <button
            type="button"
            class="ui-document-button"
            disabled={props.saving}
            onClick={handleSave}
          >
            {props.saving ? t('저장 중…') : t('저장')}
          </button>
        </Show>
        <Show when={props.onChange !== undefined && props.onToggleEditing !== undefined}>
          <button
            type="button"
            class="ui-document-button aria-pressed:bg-selection aria-pressed:text-tree-icon"
            aria-pressed={props.editing ?? false}
            disabled={props.saving}
            onClick={handleToggleEditing}
          >
            <span aria-hidden="true" class={props.editing ? 'i-tabler-check' : 'i-tabler-pencil'} />
            {t('편집')}
          </button>
        </Show>
        <Show when={props.onClose}>
          <button
            class="ui-icon-button"
            type="button"
            aria-label={t('닫기')}
            onClick={() => props.onClose?.()}
          >
            <span aria-hidden="true" class="i-tabler-x" />
          </button>
        </Show>
      </header>
      <Show
        when={props.document.source !== null}
        fallback={
          <p role="status" class="m-0 px-4 py-3 text-sm text-muted">
            {props.pending ? t('불러오는 중…') : t('텍스트 변경 내용을 표시할 수 없습니다.')}
          </p>
        }
      >
        <SDeletedOriginal
          document={props.document}
          class={props.onChange === undefined ? 'flex-1' : undefined}
          readOnlyLabel={props.onChange !== undefined}
          matches={matches().original}
          activeMatch={originalActive()}
          searchScrollRequest={props.searchScrollRequest}
          onFind={props.onFind}
          onSave={handleSave}
        />
        <Show
          when={props.onChange !== undefined && (props.editing || (props.draftSource ?? '') !== '')}
        >
          <div role="region" aria-label={t('새 파일 내용')} class="flex min-h-0 flex-1 flex-col">
            <ViewStateContext.Provider value={{bind: () => undefined}}>
              <Show when={props.document.path} keyed>
                {(path) => (
                  <SCodeEditor
                    source={props.draftSource ?? ''}
                    location={{column: 1, line: 1, path}}
                    readOnly={!props.editing}
                    matches={matches().draft}
                    activeMatch={draftActive()}
                    searchScrollRequest={props.searchScrollRequest}
                    onChange={props.editing ? props.onChange : undefined}
                    onSave={handleSave}
                    onFind={props.onFind}
                    onError={props.onError}
                  />
                )}
              </Show>
            </ViewStateContext.Provider>
          </div>
        </Show>
      </Show>
    </>
  )
}
