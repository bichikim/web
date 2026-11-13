import {Dialog} from '@kobalte/core/dialog'
import {type Accessor, For, Show} from 'solid-js'
import {EditorButton, useEditorPortalMount} from '../../design-system'
import type {ModelCommandResult} from '../model'
import type {PuppetDocument} from '../../player'
import type {DocumentRecovery} from '../document-recovery'
import {useDocumentRecovery} from '../use-document-recovery'

interface DocumentRecoveryDialogProps {
  readonly recovery: DocumentRecovery
  /** Current shared-model revision; omitted when the host performs its own conflict check. */
  readonly revision?: Accessor<number>
  readonly onRestore: (document: PuppetDocument) => ModelCommandResult
  readonly onClose: () => void
  readonly onReturnFocus: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {dateStyle: 'medium', timeStyle: 'medium'})

export const DocumentRecoveryDialog = (props: DocumentRecoveryDialogProps) => {
  const mount = useEditorPortalMount()
  const recovery = useDocumentRecovery(props)
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      props.onClose()
    }
  }
  const handleReturnFocus = (event: Event) => {
    event.preventDefault()
    props.onReturnFocus()
  }
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <Dialog.Portal mount={mount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content class="document-recovery-dialog" onCloseAutoFocus={handleReturnFocus}>
          <section>
            <header>
              <div>
                <Dialog.Title>복구 찾기</Dialog.Title>
                <Dialog.Description>
                  이 브라우저의 다른 탭에서 자동 저장한 작업입니다.
                </Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="복구 찾기 닫기">×</Dialog.CloseButton>
            </header>
            <Show when={recovery.loading()}>
              <p role="status">저장된 작업 찾는 중…</p>
            </Show>
            <Show when={recovery.error()}>
              {(message) => (
                <p class="auto-mesh-error" role="alert">
                  {message()}
                </p>
              )}
            </Show>
            <Show when={!recovery.loading()}>
              <Show
                when={recovery.entries().length > 0}
                fallback={
                  <Show when={!recovery.error()}>
                    <p>복구할 작업이 없습니다.</p>
                  </Show>
                }
              >
                <ul aria-label="자동 저장 작업">
                  <For each={recovery.entries()}>
                    {(entry) => (
                      <li>
                        <div>
                          <strong>
                            {entry.savedAt === null
                              ? '저장 시각 없음'
                              : DATE_FORMAT.format(entry.savedAt)}
                          </strong>
                          <span>
                            파츠 {entry.partCount}개 · 모션 {entry.motionCount}개
                          </span>
                        </div>
                        <EditorButton
                          disabled={recovery.restoring()}
                          onClick={() => recovery.restore(entry.id)}
                        >
                          복구
                        </EditorButton>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={recovery.restoring()}>
                <p role="status">작업 복구 중…</p>
              </Show>
              <footer>
                <EditorButton
                  class="secondary"
                  disabled={recovery.restoring()}
                  onClick={recovery.refresh}
                >
                  다시 찾기
                </EditorButton>
                <Dialog.CloseButton class="secondary">닫기</Dialog.CloseButton>
              </footer>
            </Show>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
