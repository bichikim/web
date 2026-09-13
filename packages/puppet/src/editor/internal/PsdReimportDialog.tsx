import {PsdSourceSelect} from './PsdSourceSelect'
import {Dialog} from '@kobalte/core/dialog'
import {createUniqueId, For, Match, Show, Switch} from 'solid-js'
import {EditorButton, EditorCheckbox, useEditorPortalMount} from '../../design-system'
import type {PsdReimportController} from '../use-psd-reimport'

interface PsdReimportDialogProps {
  readonly controller: PsdReimportController
}
export const PsdReimportDialog = (props: PsdReimportDialogProps) => {
  const mount = useEditorPortalMount()
  const includeNewId = createUniqueId()
  const removeMissingId = createUniqueId()
  const review = () => {
    const state = props.controller.state()
    return state.kind === 'review' ? state : undefined
  }
  const error = () => {
    const state = props.controller.state()
    return state.kind === 'error' ? state.message : undefined
  }
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      props.controller.cancel()
    }
  }
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    props.controller.apply()
  }
  return (
    <Dialog open={props.controller.state().kind !== 'idle'} onOpenChange={handleOpenChange}>
      <Dialog.Portal mount={mount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content class="auto-mesh-dialog-content psd-reimport-dialog">
          <form onSubmit={handleSubmit}>
            <header>
              <div>
                <Dialog.Title>PSD 재가져오기</Dialog.Title>
                <Dialog.Description>
                  기존 메시와 리깅을 유지하며 그림을 갱신합니다.
                </Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="재가져오기 닫기">×</Dialog.CloseButton>
            </header>
            <Switch>
              <Match when={props.controller.state().kind === 'loading'}>
                <p role="status">레이어를 비교하는 중…</p>
              </Match>
              <Match when={error()}>
                <p role="alert" class="auto-mesh-error">
                  {error()}
                </p>
              </Match>
              <Match when={review()}>
                {(value) => (
                  <>
                    <p class="psd-reimport-file">{value().fileName}</p>
                    <PsdSourceSelect plan={value().plan} onChange={props.controller.selectSource} />
                    <Show when={value().plan.viewportChanged}>
                      <p>원본 캔버스 크기가 변경되었습니다. 기존 모델 크기를 유지합니다.</p>
                    </Show>
                    <ul class="psd-reimport-list">
                      <For each={props.controller.selection().rows}>
                        {(row) => (
                          <li>
                            <span>{row.label}</span>
                            <div>
                              <strong>{row.name}</strong>
                              <small>{row.detail}</small>
                            </div>
                          </li>
                        )}
                      </For>
                    </ul>
                    <Show when={props.controller.selection().hasAdditions}>
                      <div class="psd-reimport-add">
                        <EditorCheckbox
                          inputId={includeNewId}
                          label="새 레이어도 추가"
                          checked={props.controller.includeNew()}
                          onChange={props.controller.setIncludeNew}
                        />
                        <label for={includeNewId}>새 레이어도 추가 (기존 레이어 위)</label>
                      </div>
                    </Show>
                    <Show when={props.controller.selection().hasMissing}>
                      <div class="psd-reimport-add">
                        <EditorCheckbox
                          inputId={removeMissingId}
                          label="사라진 레이어 삭제"
                          checked={props.controller.removeMissing()}
                          onChange={props.controller.setRemoveMissing}
                        />
                        <label for={removeMissingId}>원본에서 사라진 레이어 삭제</label>
                      </div>
                      <Show when={props.controller.removeMissing()}>
                        <p>
                          삭제할 레이어의 키폼·마스크·Glue 연결도 함께 정리합니다. 실행 취소로
                          복원할 수 있습니다.
                        </p>
                      </Show>
                    </Show>
                    <Show when={props.controller.selection().hasRetained}>
                      <p>
                        충돌하거나 잠긴 레이어는 유지합니다. 사라진 레이어도 삭제를 선택하지 않으면
                        유지합니다.
                      </p>
                    </Show>
                    <For each={value().warnings}>{(warning) => <p>{warning}</p>}</For>
                  </>
                )}
              </Match>
            </Switch>
            <footer>
              <Dialog.CloseButton class="secondary" aria-label="취소">
                취소
              </Dialog.CloseButton>
              <EditorButton type="submit" disabled={props.controller.selection().count === 0}>
                적용 {props.controller.selection().count}개
              </EditorButton>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
