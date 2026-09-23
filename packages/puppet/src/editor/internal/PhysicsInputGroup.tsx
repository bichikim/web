import {For} from 'solid-js'

import type {PuppetDocument, PuppetPendulum} from '../../player'
import {PhysicsPendulumEditor} from './PhysicsPendulumEditor'
import type {PhysicsNumberProperty, PhysicsParameterProperty} from './physics'

interface PhysicsInputGroupProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly inputLabel: string
  readonly pendulums: ReadonlyArray<PuppetPendulum>
  readonly allPendulums: ReadonlyArray<PuppetPendulum>
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

export const PhysicsInputGroup = (props: PhysicsInputGroupProps) => (
  <section class="physics-input-group" aria-label={`${props.inputLabel} 물리 연결`}>
    <header class="physics-input-header">
      <strong>{props.inputLabel}</strong>
      <span>연결 {props.pendulums.length}개</span>
    </header>
    <For each={props.pendulums}>
      {(pendulum) => (
        <PhysicsPendulumEditor
          disabled={props.disabled}
          document={props.document}
          index={() => props.allPendulums.findIndex((candidate) => candidate.id === pendulum.id)}
          pendulum={pendulum}
          pendulums={props.allPendulums}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onNumberChange={props.onNumberChange}
          onParameterChange={props.onParameterChange}
          onRemove={props.onRemove}
        />
      )}
    </For>
  </section>
)
