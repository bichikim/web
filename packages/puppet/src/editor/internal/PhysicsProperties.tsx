import {EditorButton} from '../../design-system'
import type {PuppetDocument, PuppetPendulum} from '../../player'
import {For, Show} from 'solid-js'

import {PhysicsPendulumEditor} from './PhysicsPendulumEditor'
import {
  type PhysicsNumberProperty,
  type PhysicsOperation,
  type PhysicsParameterProperty,
  updatePhysics,
} from './physics'

export interface PhysicsPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const getPendulums = (document: PuppetDocument) => document.physics?.pendulums ?? []

const canAddPendulum = (document: PuppetDocument) => {
  const parameters = document.parameters ?? []
  const usedOutputIds = new Set(
    getPendulums(document).map((pendulum) => pendulum.outputParameterId),
  )

  return parameters.some(
    (outputParameter) =>
      !usedOutputIds.has(outputParameter.id) &&
      parameters.some((inputParameter) => inputParameter.id !== outputParameter.id),
  )
}

export const PhysicsProperties = (props: PhysicsPropertiesProps) => {
  const pendulums = () => getPendulums(props.document)
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const canAdd = () => canAddPendulum(props.document)
  const addButtonTitle = () => {
    if (props.disabled === true) {
      return '애니메이션 모드에서는 Physics 설정을 수정할 수 없습니다.'
    }
    if (props.onDocumentChange === undefined) {
      return '문서 변경 콜백이 없어 Physics 설정을 수정할 수 없습니다.'
    }
    if (!canAdd()) {
      return '사용 가능한 서로 다른 입력·출력 parameter가 없습니다.'
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
  const handleAdd = () => applyOperation({kind: 'add'})
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
      <legend>Physics</legend>
      <div class="physics-header">
        <span>{pendulums().length}개 Pendulum</span>
        <EditorButton
          class="physics-action-button"
          disabled={disabled() || !canAdd()}
          title={addButtonTitle()}
          onClick={handleAdd}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          Pendulum 추가
        </EditorButton>
      </div>
      <Show
        when={pendulums().length > 0}
        fallback={<p class="physics-empty">Pendulum을 추가하면 parameter 움직임을 연결합니다.</p>}
      >
        <div class="physics-pendulum-list">
          <For each={pendulums()}>
            {(pendulum, index) => (
              <PhysicsPendulumEditor
                disabled={disabled()}
                document={props.document}
                index={index}
                pendulum={pendulum}
                pendulums={pendulums()}
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
