import {Dialog} from '@kobalte/core/dialog'
import {createUniqueId, Show} from 'solid-js'
import {useKeyformTools} from './use-keyform-tools'
import {
  EditorButton,
  EditorCheckbox,
  EditorNumberField,
  EditorSegmentedField,
  EditorSelect,
  useEditorPortalMount,
} from '../../design-system'
import type {PuppetParameter, PuppetParameterBinding, PuppetPoint} from '../../player'
import type {PuppetParameterValues} from '../../deformation'
import type {MirrorKeyformSettings} from './mirror-keyform'
import type {CornerKeyformSettings} from './generate-corner-keyforms'

export interface EditorKeyformToolsProps {
  readonly binding?: PuppetParameterBinding
  readonly values?: PuppetParameterValues | null
  readonly parameters?: readonly PuppetParameter[]
  readonly center?: PuppetPoint
  readonly onMirror?: (settings: MirrorKeyformSettings) => string | null
  readonly onGenerate?: (settings: CornerKeyformSettings) => string | null
}

export const EditorKeyformTools = (props: EditorKeyformToolsProps) => {
  const mount = useEditorPortalMount()
  const overwriteId = createUniqueId()
  const {
    open,
    setOpen,
    operation,
    setOperation,
    axis,
    center,
    setCenter,
    parameterId,
    setParameterId,
    overwrite,
    setOverwrite,
    reference,
    setReference,
    error,
    parameters,
    targetCount,
    hasSource,
    canApply,
    handleAxisChange,
    handleSubmit,
  } = useKeyformTools(props)
  return (
    <Dialog modal open={open()} onOpenChange={setOpen}>
      <Dialog.Trigger
        class="editor-control editor-button"
        data-control-size="sm"
        disabled={
          props.binding === undefined ||
          (props.onMirror === undefined && props.onGenerate === undefined)
        }
      >
        키폼 도구
      </Dialog.Trigger>
      <Dialog.Portal mount={mount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content class="auto-mesh-dialog-content">
          <form onSubmit={handleSubmit}>
            <header>
              <div>
                <Dialog.Title>키폼 도구</Dialog.Title>
                <Dialog.Description>
                  현재 파라미터에 연결된 {targetCount()}개 레이어에 적용합니다.
                </Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="키폼 도구 닫기">
                <span class="puppet-icon puppet-icon-x" aria-hidden="true" />
              </Dialog.CloseButton>
            </header>
            <EditorSegmentedField
              label="키폼 작업"
              value={operation()}
              onChange={setOperation}
              options={[
                {disabled: !hasSource(), label: '동작 반전', value: 'mirror'},
                {
                  disabled: props.binding?.parameterIds.length !== 2,
                  label: '네 모서리 생성',
                  value: 'corners',
                },
              ]}
            />
            <div class="auto-mesh-settings">
              <Show
                when={operation() === 'mirror'}
                fallback={
                  <label>
                    <span>기준 형태</span>
                    <EditorSegmentedField
                      label="모서리 기준 형태"
                      value={reference()}
                      onChange={setReference}
                      options={[
                        {label: '기본값', value: 'default'},
                        {label: '범위 중앙', value: 'middle'},
                      ]}
                    />
                  </label>
                }
              >
                <label>
                  <span>반전 방향</span>
                  <EditorSegmentedField
                    label="동작 반전 방향"
                    value={axis()}
                    onChange={handleAxisChange}
                    options={[
                      {label: '좌우', value: 'x'},
                      {label: '상하', value: 'y'},
                    ]}
                  />
                </label>
                <label>
                  <span>반전할 파라미터</span>
                  <EditorSelect
                    label="반전할 파라미터"
                    value={parameterId()}
                    options={parameters().map((parameter) => parameter.id)}
                    optionLabel={(id) =>
                      parameters().find((parameter) => parameter.id === id)?.name ?? id
                    }
                    onChange={setParameterId}
                  />
                </label>
                <label>
                  <span>메시 반전 기준 {axis().toUpperCase()}</span>
                  <EditorNumberField
                    label="메시 반전 기준"
                    value={center()}
                    onValueChange={setCenter}
                  />
                </label>
              </Show>
              <div class="flex items-center justify-between gap-editor-field">
                <label for={overwriteId}>기존 키폼 덮어쓰기</label>
                <EditorCheckbox
                  inputId={overwriteId}
                  label="기존 키폼 덮어쓰기"
                  checked={overwrite()}
                  onChange={setOverwrite}
                />
              </div>
            </div>
            <p class="auto-mesh-warning">
              {operation() === 'mirror'
                ? '기본값 반대편에 저장합니다. 워프·회전 디포머는 각 디포머의 중심을 기준으로 반전합니다.'
                : '기준과 상하좌우 끝값의 키폼이 필요합니다. 기존 모서리는 덮어쓰기를 선택할 때만 바뀝니다.'}
            </p>
            <Show when={error()}>
              {(message) => (
                <p class="auto-mesh-error" role="alert">
                  {message()}
                </p>
              )}
            </Show>
            <footer>
              <Dialog.CloseButton class="secondary">취소</Dialog.CloseButton>
              <EditorButton type="submit" disabled={!canApply()}>
                {operation() === 'mirror' ? '동작 반전 적용' : '네 모서리 생성'}
              </EditorButton>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
