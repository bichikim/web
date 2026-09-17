import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetDocument, PuppetPendulum} from '../../player'
import {type Accessor, For} from 'solid-js'
import {type PhysicsNumberProperty, type PhysicsParameterProperty} from './physics'

interface PhysicsParameterFieldDefinition {
  readonly label: string
  readonly property: PhysicsParameterProperty
}

interface PhysicsNumberFieldDefinition {
  readonly label: string
  readonly minimum?: number
  readonly property: PhysicsNumberProperty
  readonly step: number
}

const PHYSICS_PARAMETER_FIELDS: ReadonlyArray<PhysicsParameterFieldDefinition> = [
  {label: '입력 parameter', property: 'inputParameterId'},
  {label: '출력 parameter', property: 'outputParameterId'},
]

const PHYSICS_NUMBER_FIELDS: ReadonlyArray<PhysicsNumberFieldDefinition> = [
  {label: '중력', minimum: 0.01, property: 'gravity', step: 0.1},
  {label: '길이', minimum: 0.01, property: 'length', step: 0.1},
  {label: '감쇠', minimum: 0, property: 'damping', step: 0.1},
  {label: '입력 배율', property: 'inputScale', step: 0.1},
  {label: '출력 배율', property: 'outputScale', step: 0.1},
]

export interface PhysicsPendulumEditorProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly index: Accessor<number>
  readonly pendulum: PuppetPendulum
  readonly pendulums: ReadonlyArray<PuppetPendulum>
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onNumberChange: (
    pendulumId: string,
    property: PhysicsNumberProperty,
    value: number,
  ) => void
  readonly onParameterChange: (
    pendulumId: string,
    property: PhysicsParameterProperty,
    value: string,
  ) => void
  readonly onRemove: (pendulumId: string) => void
}

const getParameterLabel = (document: PuppetDocument, parameterId: string) => {
  const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
  return parameter === undefined || parameter.name === parameter.id
    ? parameterId
    : `${parameter.name} · ${parameter.id}`
}

const getParameterOptions = (
  pendulum: PuppetPendulum,
  pendulums: ReadonlyArray<PuppetPendulum>,
  parameters: PuppetDocument['parameters'],
  property: PhysicsParameterProperty,
) => {
  const usedOutputIds = new Set(
    pendulums
      .filter((candidate) => candidate.id !== pendulum.id)
      .map((candidate) => candidate.outputParameterId),
  )

  return (parameters ?? [])
    .filter((parameter) =>
      property === 'inputParameterId'
        ? parameter.id !== pendulum.outputParameterId
        : parameter.id !== pendulum.inputParameterId &&
          (parameter.id === pendulum.outputParameterId || !usedOutputIds.has(parameter.id)),
    )
    .map((parameter) => parameter.id)
}

export const PhysicsPendulumEditor = (props: PhysicsPendulumEditorProps) => {
  const title = () => `Pendulum ${props.index() + 1}`
  const parameterLabel = (parameterId: string) => getParameterLabel(props.document, parameterId)

  return (
    <article class="physics-pendulum">
      <header class="physics-pendulum-header">
        <h3>
          {title()} <code>{props.pendulum.id}</code>
        </h3>
        <EditorButton
          aria-label={`${title()} 삭제`}
          class="physics-remove-button"
          disabled={props.disabled}
          title={`${title()} 설정을 삭제합니다.`}
          onClick={() => props.onRemove(props.pendulum.id)}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        </EditorButton>
      </header>
      <div class="physics-parameter-fields">
        <For each={PHYSICS_PARAMETER_FIELDS}>
          {(field) => (
            <label>
              {field.label}
              <EditorSelect
                label={`${title()} ${field.label}`}
                options={getParameterOptions(
                  props.pendulum,
                  props.pendulums,
                  props.document.parameters,
                  field.property,
                )}
                value={props.pendulum[field.property]}
                disabled={props.disabled}
                optionLabel={parameterLabel}
                onChange={(value) =>
                  props.onParameterChange(props.pendulum.id, field.property, value)
                }
              />
            </label>
          )}
        </For>
      </div>
      <div class="physics-number-fields">
        <For each={PHYSICS_NUMBER_FIELDS}>
          {(field) => (
            <label>
              {field.label}
              <EditorNumberField
                label={`${title()} ${field.label}`}
                minimum={field.minimum}
                name={`${props.pendulum.id}-${field.property}`}
                step={field.step}
                value={props.pendulum[field.property]}
                disabled={props.disabled}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.onNumberChange(props.pendulum.id, field.property, value)
                }
              />
            </label>
          )}
        </For>
      </div>
    </article>
  )
}
