import {Dialog} from '@kobalte/core/dialog'
import {createUniqueId, Show} from 'solid-js'
import {CUSTOM_REFERENCE, useKeyformTools} from './use-keyform-tools'
import {
  EditorButton,
  EditorCheckbox,
  EditorNumberField,
  EditorSegmentedField,
  EditorSelect,
  useEditorPortalMount,
} from '../../design-system'
import type {PuppetParameter, PuppetParameterBinding} from '../../player'
import type {MirrorAxisReference} from './mirror-axis-references'
import {MAX_PARAMETER_DIMENSIONS, type PuppetParameterValues} from '../../deformation'
import type {MirrorKeyformSettings} from './mirror-keyform'
import type {CornerKeyformSettings} from './generate-corner-keyforms'

export interface EditorKeyformToolsProps {
  readonly binding?: PuppetParameterBinding
  readonly values?: PuppetParameterValues | null
  readonly parameters?: readonly PuppetParameter[]
  /** Mirror axis points; the first is the default. */
  readonly centers?: ReadonlyArray<MirrorAxisReference>
  readonly onMirror?: (settings: MirrorKeyformSettings) => string | null
  readonly onGenerate?: (settings: CornerKeyformSettings) => string | null
}

interface CornerSettingsProps {
  readonly onPlanesChange: (planes: 'current' | 'all') => void
  readonly onReferenceChange: (reference: 'default' | 'middle') => void
  readonly planes: 'current' | 'all'
  readonly reference: 'default' | 'middle'
  /** A 3D binding, which chooses its planes. */
  readonly volume: boolean
}

const CornerSettings = (props: CornerSettingsProps) => (
  <>
    <label>
      <span>기준 형태</span>
      <EditorSegmentedField
        label="모서리 기준 형태"
        value={props.reference}
        onChange={props.onReferenceChange}
        options={[
          {label: '기본값', value: 'default'},
          {label: '범위 중앙', value: 'middle'},
        ]}
      />
    </label>
    <Show when={props.volume}>
      <label>
        <span>적용 평면</span>
        <EditorSegmentedField
          label="모서리 적용 평면"
          value={props.planes}
          onChange={props.onPlanesChange}
          options={[
            {label: '현재 평면', value: 'current'},
            {label: '모든 평면', value: 'all'},
          ]}
        />
      </label>
    </Show>
  </>
)

interface MirrorSettingsProps {
  readonly axis: 'x' | 'y'
  readonly center: number
  readonly centerReference: string
  readonly centers?: ReadonlyArray<MirrorAxisReference>
  readonly onAxisChange: (axis: 'x' | 'y') => void
  readonly onCenterChange: (center: number) => void
  readonly onCenterReferenceChange: (reference: string) => void
  readonly onParameterChange: (parameterId: string) => void
  readonly parameterId: string
  readonly parameters: readonly PuppetParameter[]
}

/** Direction, parameter and mesh axis of motion mirroring. */
const MirrorSettings = (props: MirrorSettingsProps) => (
  <>
    <label>
      <span>반전 방향</span>
      <EditorSegmentedField
        label="동작 반전 방향"
        value={props.axis}
        onChange={props.onAxisChange}
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
        value={props.parameterId}
        options={props.parameters.map((parameter) => parameter.id)}
        optionLabel={(id) => props.parameters.find((parameter) => parameter.id === id)?.name ?? id}
        onChange={props.onParameterChange}
      />
    </label>
    <label>
      <span>기준 위치</span>
      <EditorSelect
        label="메시 반전 기준 위치"
        value={props.centerReference}
        options={[CUSTOM_REFERENCE, ...(props.centers ?? []).map((_, index) => String(index))]}
        optionLabel={(value) =>
          value === CUSTOM_REFERENCE
            ? '직접 입력'
            : (props.centers?.[Number(value)]?.label ?? value)
        }
        onChange={props.onCenterReferenceChange}
      />
    </label>
    <label>
      <span>메시 반전 기준 {props.axis.toUpperCase()}</span>
      <EditorNumberField
        label="메시 반전 기준"
        value={props.center}
        onValueChange={props.onCenterChange}
      />
    </label>
  </>
)

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
    centerReference,
    setCenter,
    selectCenterReference,
    parameterId,
    setParameterId,
    overwrite,
    setOverwrite,
    planes,
    reference,
    setPlanes,
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
                  disabled: (props.binding?.parameterIds.length ?? 0) < 2,
                  label: '네 모서리 생성',
                  value: 'corners',
                },
              ]}
            />
            <div class="auto-mesh-settings">
              <Show
                when={operation() === 'mirror'}
                fallback={
                  <CornerSettings
                    planes={planes()}
                    reference={reference()}
                    volume={props.binding?.parameterIds.length === MAX_PARAMETER_DIMENSIONS}
                    onPlanesChange={setPlanes}
                    onReferenceChange={setReference}
                  />
                }
              >
                <MirrorSettings
                  axis={axis()}
                  center={center()}
                  centerReference={centerReference()}
                  centers={props.centers}
                  parameterId={parameterId()}
                  parameters={parameters()}
                  onAxisChange={handleAxisChange}
                  onCenterChange={setCenter}
                  onCenterReferenceChange={selectCenterReference}
                  onParameterChange={setParameterId}
                />
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
