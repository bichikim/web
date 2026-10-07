import {createEffect, createMemo, createSignal, Match, Show, Switch} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {SCodeDocument, type SCodeDocumentProps} from './SCodeDocument'
import {SMarkdown} from './SMarkdown'
import {SMediaDocument} from './SMediaDocument'
import {STableDocument} from './STableDocument'
import {hasDocumentSource} from '../shared/has-document-source'
import {useFileViewState} from './view-state/context'
import type {ViewerPort} from './types'

interface SFileDocumentProps extends SCodeDocumentProps {
  port: ViewerPort
  session: string
  searchVisible?: boolean
  onOpen?: (location: CodeLocation) => void
  onPreview?: () => void
  onError?: (error: unknown) => void
}
export const SFileDocument = (props: SFileDocumentProps) => {
  const state = useFileViewState()
  const markdown = () => fileFormat(props.document.location.path)?.kind === 'markdown'
  const table = () => fileFormat(props.document.location.path)?.kind === 'table'
  const svg = () => props.document.media?.mimeType === 'image/svg+xml'
  const sourceAvailable = () => hasDocumentSource(props.document)
  const path = createMemo(() => props.document.location.path)
  const mode = createMemo(() => {
    path()
    const [originalMode, setOriginalMode] = createSignal(state?.read()?.original ?? false)
    return {original: originalMode, setOriginal: setOriginalMode}
  })
  const original = (): boolean => mode().original()
  const setOriginal = (value: boolean): void => {
    mode().setOriginal(value)
    state?.update({original: value})
  }
  createEffect(() => {
    if (
      sourceAvailable() &&
      (props.searchVisible ||
        props.document.location.line > 1 ||
        state?.request().restore === false)
    ) {
      setOriginal(true)
    }
  })
  const handlePreview = (): void => {
    props.onPreview?.()
    setOriginal(false)
  }
  const handleTableError = (error: unknown): void => {
    setOriginal(true)
    props.onError?.(error)
  }
  return (
    <>
      <Show when={markdown() || table() || svg()}>
        <div
          aria-label="문서 표시 방식"
          class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-2"
        >
          <button
            class="ui-document-button"
            type="button"
            aria-pressed={!original()}
            onClick={handlePreview}
          >
            미리보기
          </button>
          <button
            class="ui-document-button"
            type="button"
            aria-pressed={original()}
            disabled={!sourceAvailable()}
            title={sourceAvailable() ? undefined : '512 KiB 이하 SVG에서 원문을 볼 수 있습니다.'}
            onClick={() => setOriginal(true)}
          >
            원문
          </button>
          <Show when={props.document.location.path.toLowerCase().endsWith('.mdx')}>
            <span class="self-center text-xs text-muted">MDX 코드는 실행하지 않습니다.</span>
          </Show>
        </div>
      </Show>
      <Switch fallback={<SCodeDocument {...props} />}>
        <Match when={props.document.media !== undefined && !original()}>
          <Show
            when={`${props.session}:${props.document.location.path}:${props.document.revision}`}
            keyed
          >
            {(_key) => (
              <SMediaDocument
                port={props.port}
                session={props.session}
                document={props.document}
                onError={props.onError}
              />
            )}
          </Show>
        </Match>
        <Match when={markdown() && !original()}>
          <SMarkdown
            source={props.document.source}
            path={props.document.location.path}
            port={props.port}
            session={props.session}
            onOpen={props.onOpen}
          />
        </Match>
        <Match when={table() && !original()}>
          <STableDocument
            source={props.document.source}
            delimiter={props.document.location.path.toLowerCase().endsWith('.tsv') ? '\t' : ','}
            onError={handleTableError}
          />
        </Match>
      </Switch>
    </>
  )
}
