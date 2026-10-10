import {type JSX, Match, Show, Switch} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {SCodeDocument, type SCodeDocumentProps} from './SCodeDocument'
import {SMarkdown} from './SMarkdown'
import {SMediaDocument} from './SMediaDocument'
import {STableDocument} from './STableDocument'
import {hasDocumentSource} from '../shared/has-document-source'
import {useDocumentMode} from './use-document-mode'
import type {useCodeEditing} from './use-code-editing'
import {SEditingToolbar} from './editor/SEditingToolbar'
import type {ViewerPort} from './types'

interface SFileDocumentProps extends SCodeDocumentProps {
  port: ViewerPort
  session: string
  searchVisible?: boolean
  onOpen?: (location: CodeLocation) => void
  onPreview?: () => void
  onError?: (error: unknown) => void
  editing?: ReturnType<typeof useCodeEditing>
  editor?: JSX.Element
  onDiscard?: () => void
  onShareChanges?: () => void
}
export const SFileDocument = (props: SFileDocumentProps) => {
  const markdown = () => fileFormat(props.document.location.path)?.kind === 'markdown'
  const table = () => fileFormat(props.document.location.path)?.kind === 'table'
  const svg = () => props.document.media?.mimeType === 'image/svg+xml'
  const sourceAvailable = () => hasDocumentSource(props.document)
  const mode = useDocumentMode({
    document: () => props.document,
    onError: (error) => props.onError?.(error),
    onPreview: () => props.onPreview?.(),
    searchVisible: () => props.searchVisible === true,
    sourceAvailable,
  })
  const previewAvailable = (): boolean => markdown() || table() || svg()
  const editable = (): boolean => props.editing?.editable() === true
  const editingEnabled = (): boolean => editable() && props.editing?.enabled() === true
  const editorVisible = (): boolean =>
    editable() &&
    (editingEnabled() ||
      (props.editing?.dirty() === true && (mode.original() || !previewAvailable())))
  const source = (): string => (editable() ? props.editing!.source() : props.document.source)
  return (
    <>
      <Show when={previewAvailable() || editable()}>
        <div
          aria-label="문서 도구"
          role="group"
          class="flex shrink-0 items-center gap-2 border-b border-divider px-4 py-2"
        >
          <Show when={previewAvailable() && !editingEnabled()}>
            <div aria-label="문서 표시 방식" role="group" class="flex min-w-0 items-center gap-2">
              <button
                class="ui-document-button"
                type="button"
                aria-pressed={!mode.original()}
                onClick={mode.showPreview}
              >
                미리보기
              </button>
              <button
                class="ui-document-button"
                type="button"
                aria-pressed={mode.original()}
                disabled={!sourceAvailable()}
                title={
                  sourceAvailable() ? undefined : '512 KiB 이하 SVG에서 원문을 볼 수 있습니다.'
                }
                onClick={mode.showOriginal}
              >
                원문
              </button>
              <Show when={props.document.location.path.toLowerCase().endsWith('.mdx')}>
                <span class="self-center text-xs text-muted">MDX 코드는 실행하지 않습니다.</span>
              </Show>
            </div>
          </Show>
          <Show when={editable() ? props.editing : undefined}>
            {(editing) => (
              <SEditingToolbar
                editing={editing()}
                onDiscard={props.onDiscard}
                onShareChanges={props.onShareChanges}
              />
            )}
          </Show>
        </div>
      </Show>
      <Switch fallback={<SCodeDocument {...props} />}>
        <Match when={editorVisible()}>{props.editor}</Match>
        <Match when={props.document.media !== undefined && !mode.original()}>
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
        <Match when={markdown() && !mode.original()}>
          <SMarkdown
            source={source()}
            path={props.document.location.path}
            port={props.port}
            session={props.session}
            onOpen={props.onOpen}
          />
        </Match>
        <Match when={table() && !mode.original()}>
          <STableDocument
            source={source()}
            delimiter={props.document.location.path.toLowerCase().endsWith('.tsv') ? '\t' : ','}
            onError={mode.reportTableError}
          />
        </Match>
      </Switch>
    </>
  )
}
