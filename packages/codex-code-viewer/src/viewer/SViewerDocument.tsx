import {useTranslations} from './locale/use-translations'
import {Show, untrack} from 'solid-js'
import type {EditorState} from '@codemirror/state'
import {createBoundedCache} from '../shared/create-bounded-cache'
import {MAX_CODE_BYTES, MAX_DRAFT_FILES} from '../shared/editing-limits'
import type {DeletedDocumentView, ViewerPort} from './types'
import type {useViewer} from './use-viewer'
import type {useDocumentSearch} from './use-document-search'
import {SWorkspacePrompt} from './SWorkspacePrompt'
import {SReferenceChoices} from './SReferenceChoices'
import {SFileDocument} from './SFileDocument'
import {SCodeEditor} from './editor/SCodeEditor'
import {useDocumentChanges} from './use-document-changes'
import {useChangeInspection} from './use-change-inspection'
import {SDeletedDocument} from './SDeletedDocument'
interface SViewerDocumentProps {
  readonly deletedView?: DeletedDocumentView | null
  readonly port: ViewerPort
  readonly viewer: ReturnType<typeof useViewer>
  readonly search: ReturnType<typeof useDocumentSearch>
  readonly previewLines?: number
  readonly onFind: (text?: string) => void
}
export const SViewerDocument = (props: SViewerDocumentProps) => {
  const t = useTranslations()
  const editorStates = createBoundedCache<EditorState>({
    maxEntries: MAX_DRAFT_FILES,
    maxWeight: MAX_CODE_BYTES * MAX_DRAFT_FILES,
    weight: (state) => state.doc.length,
  })
  const handleDiscard = (): void => {
    props.viewer.editing.discard()
    props.viewer.refresh()
  }
  const changes = useDocumentChanges({
    onError: (error) => props.viewer.reportError(error),
    port: untrack(() => props.port),
    revision: () => props.viewer.workspaceRevision(),
    session: () => props.viewer.session(),
    source: () => props.viewer.editing.source(),
  })
  const inspection = useChangeInspection({
    base: changes.base,
    hunks: changes.hunks,
    path: () => props.viewer.session()?.document.location.path,
    source: () => props.viewer.editing.source(),
  })
  return (
    <section aria-label={t('파일 내용')} class="flex min-h-0 min-w-0 flex-1 flex-col">
      <Show
        when={props.deletedView}
        fallback={
          <Show
            when={props.viewer.session()}
            fallback={<SWorkspacePrompt workspace={props.viewer.workspaceSession()?.workspace} />}
          >
            {(session) => (
              <>
                <Show when={props.viewer.deleted()}>
                  <div
                    role="status"
                    aria-label={t('파일 삭제 상태')}
                    class="shrink-0 border-b border-divider bg-selection px-4 py-3 text-sm text-foreground"
                  >
                    <p>
                      {props.viewer.editing.editable()
                        ? t('파일이 삭제되었습니다. 다시 편집 후 저장하면 파일이 만들어집니다.')
                        : t('파일이 삭제되었습니다.')}
                    </p>
                  </div>
                </Show>
                <Show when={props.viewer.references()}>
                  {(references) => (
                    <SReferenceChoices
                      references={references()}
                      previewLines={props.previewLines}
                      onOpen={props.viewer.openLocation}
                      onClose={props.viewer.dismissReferences}
                    />
                  )}
                </Show>
                <Show when={props.viewer.viewState.fileKey()} keyed>
                  {(_key) => (
                    <SFileDocument
                      changes={changes.hunks()}
                      onOpenChange={inspection.open}
                      inspection={inspection.inspection()}
                      onCloseChange={inspection.close}
                      onNavigateChange={inspection.navigate}
                      port={props.port}
                      session={session().session}
                      searchVisible={props.search.visible()}
                      onPreview={props.search.close}
                      onOpen={props.viewer.openLocation}
                      onError={props.viewer.reportError}
                      document={session().document}
                      onFollow={props.viewer.follow}
                      onSelect={props.viewer.selectLines}
                      onSelectText={props.viewer.selectText}
                      selection={props.viewer.selection() ?? undefined}
                      matches={props.search.matches()}
                      activeMatch={props.search.active()}
                      searchScrollRequest={props.search.scrollRequest()}
                      onCopy={props.viewer.copy}
                      onShare={props.viewer.share}
                      onFind={props.onFind}
                      editing={props.viewer.editing}
                      onDiscard={handleDiscard}
                      onShareChanges={props.viewer.shareChanges}
                      editor={
                        <SCodeEditor
                          changes={changes.hunks()}
                          onOpenChange={inspection.open}
                          inspection={inspection.inspection()}
                          onCloseChange={inspection.close}
                          onNavigateChange={inspection.navigate}
                          fileKey={props.viewer.viewState.fileKey() ?? ''}
                          states={editorStates}
                          source={props.viewer.editing.source()}
                          location={session().document.location}
                          request={
                            props.viewer.viewState.bind()?.request() ?? {restore: true, version: 0}
                          }
                          readOnly={
                            session().document.readOnly === true || !props.viewer.editing.enabled()
                          }
                          matches={props.search.matches()}
                          activeMatch={props.search.active()}
                          searchScrollRequest={props.search.scrollRequest()}
                          onChange={props.viewer.editing.change}
                          onSave={() => props.viewer.editing.save()}
                          onFollow={props.viewer.follow}
                          onSelect={props.viewer.selectText}
                          onShare={props.viewer.share}
                          onFind={props.onFind}
                          onError={props.viewer.reportError}
                        />
                      }
                    />
                  )}
                </Show>
              </>
            )}
          </Show>
        }
      >
        {(view) => (
          <SDeletedDocument
            {...view()}
            matches={props.search.matches()}
            activeMatch={props.search.active()}
            searchScrollRequest={props.search.scrollRequest()}
            onFind={props.onFind}
            onError={props.viewer.reportError}
          />
        )}
      </Show>
    </section>
  )
}
