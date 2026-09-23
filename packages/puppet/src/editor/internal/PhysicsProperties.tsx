import {EditorButton, EditorToggleButton} from '../../design-system'
import type {PuppetDocument, PuppetPendulum} from '../../player'
import {For, Show} from 'solid-js'

import {PhysicsInputGroup} from './PhysicsInputGroup'
import {
  type PhysicsNumberProperty,
  type PhysicsOperation,
  type PhysicsParameterProperty,
  updatePhysics,
} from './physics'

export interface PhysicsPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly inputParameterIds?: ReadonlyArray<string>
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly physicsPreview?: boolean
  readonly onPhysicsPreviewChange?: (enabled: boolean) => void
  readonly onPhysicsReset?: () => void
}

const getPendulums = (document: PuppetDocument) => document.physics?.pendulums ?? []

const getParameterLabel = (document: PuppetDocument, parameterId: string) => {
  const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
  return parameter?.name ?? parameterId
}

const getInputGroups = (document: PuppetDocument, inputParameterIds?: ReadonlyArray<string>) => {
  const pendulums = getPendulums(document)
  const visibleInputIds = inputParameterIds === undefined ? undefined : new Set(inputParameterIds)
  return (document.parameters ?? []).flatMap((parameter) => {
    if (visibleInputIds !== undefined && !visibleInputIds.has(parameter.id)) {
      return []
    }
    const connections = pendulums.filter((pendulum) => pendulum.inputParameterId === parameter.id)
    return connections.length === 0
      ? []
      : [{inputLabel: getParameterLabel(document, parameter.id), pendulums: connections}]
  })
}

const canAddPendulum = (document: PuppetDocument, inputParameterId?: string) => {
  const parameters = document.parameters ?? []
  const usedOutputIds = new Set(
    getPendulums(document).map((pendulum) => pendulum.outputParameterId),
  )

  return parameters.some(
    (outputParameter) =>
      !usedOutputIds.has(outputParameter.id) &&
      (inputParameterId === undefined
        ? parameters.some((inputParameter) => inputParameter.id !== outputParameter.id)
        : inputParameterId !== outputParameter.id),
  )
}

export const PhysicsProperties = (props: PhysicsPropertiesProps) => {
  const allPendulums = () => getPendulums(props.document)
  const inputGroups = () => getInputGroups(props.document, props.inputParameterIds)
  const pendulums = () => inputGroups().flatMap((group) => group.pendulums)
  const addInputParameterId = () => props.inputParameterIds?.[0]
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const canAdd = () => canAddPendulum(props.document, addInputParameterId())
  const addButtonTitle = () => {
    if (props.disabled === true) {
      return '애니메이션 모드에서는 물리 설정을 수정할 수 없습니다.'
    }
    if (props.onDocumentChange === undefined) {
      return '문서 변경 콜백이 없어 물리 설정을 수정할 수 없습니다.'
    }
    if (!canAdd()) {
      return '사용 가능한 서로 다른 입력·출력 파라미터가 없습니다.'
    }

    return undefined
  }
  const applyOperation = (operation: PhysicsOperation) => {
    if (disabled()) {
      return
    }

    const document = updatePhysics({document: props.document, operation})
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handleAdd = () => applyOperation({inputParameterId: addInputParameterId(), kind: 'add'})
  const handleRemove = (pendulumId: string) => applyOperation({kind: 'remove', pendulumId})
  const handleNumberChange = (pendulumId: string, property: PhysicsNumberProperty, value: number) =>
    applyOperation({
      changes: {[property]: value},
      kind: 'update',
      pendulumId,
    })
  const handleParameterChange = (
    pendulumId: string,
    property: PhysicsParameterProperty,
    value: string,
  ) =>
    applyOperation({
      changes: {[property]: value},
      kind: 'update',
      pendulumId,
    })

  return (
    <fieldset class="deformer-properties physics-properties">
      <legend>물리</legend>
      <Show when={props.onPhysicsPreviewChange !== undefined}>
        <div class="physics-header">
          <EditorToggleButton
            class="physics-action-button"
            pressed={props.physicsPreview ?? true}
            title="일시정지 중에도 관성과 감쇠를 미리 봅니다. 끄면 현재 입력의 정적 포즈를 표시합니다."
            onClick={() => props.onPhysicsPreviewChange?.(!(props.physicsPreview ?? true))}
          >
            물리 미리보기
          </EditorToggleButton>
          <EditorButton
            class="physics-action-button"
            disabled={props.onPhysicsReset === undefined}
            title="현재 포즈를 유지하며 물리의 관성을 초기화합니다."
            onClick={() => props.onPhysicsReset?.()}
          >
            물리 초기화
          </EditorButton>
        </div>
      </Show>
      <div class="physics-header">
        <span>{pendulums().length}개 물리 연결</span>
        <EditorButton
          class="physics-action-button"
          disabled={disabled() || !canAdd()}
          title={addButtonTitle()}
          onClick={handleAdd}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          물리 연결 추가
        </EditorButton>
      </div>
      <Show
        when={pendulums().length > 0}
        fallback={<p class="physics-empty">물리 연결을 추가하면 파라미터 움직임을 연결합니다.</p>}
      >
        <div class="physics-pendulum-list">
          <For each={inputGroups()}>
            {(group) => (
              <PhysicsInputGroup
                allPendulums={allPendulums()}
                disabled={disabled()}
                document={props.document}
                inputLabel={group.inputLabel}
                pendulums={group.pendulums}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onNumberChange={handleNumberChange}
                onParameterChange={handleParameterChange}
                onRemove={handleRemove}
              />
            )}
          </For>
        </div>
      </Show>
    </fieldset>
  )
}
