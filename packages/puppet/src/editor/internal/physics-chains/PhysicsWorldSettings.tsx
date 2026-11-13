import {For} from 'solid-js'
import {EditorNumberField} from '../../../design-system'
import {
  DEFAULT_PUPPET_CHAIN_FPS,
  DEFAULT_PUPPET_CHAIN_GRAVITY,
  type PuppetDocument,
} from '../../../player'
import {setPhysicsWorld} from '../physics-chains'
import type {PhysicsChainsSectionProps} from './types'

const WORLD_FIELDS = [
  {axis: 0, label: '중력 방향 X', property: 'gravity'},
  {axis: 1, label: '중력 방향 Y', property: 'gravity'},
  {axis: 0, label: '바람 X', property: 'wind'},
  {axis: 1, label: '바람 Y', property: 'wind'},
] as const

export const PhysicsWorldSettings = (props: PhysicsChainsSectionProps) => {
  const vector = (property: 'gravity' | 'wind') =>
    props.document.physics?.[property] ??
    (property === 'gravity' ? DEFAULT_PUPPET_CHAIN_GRAVITY : ([0, 0] as const))
  const apply = (document: PuppetDocument) => {
    if (!props.disabled) {
      props.onDocumentChange?.(document)
    }
  }
  return (
    <details class="entry-settings">
      <summary>체인 공통 설정</summary>
      <div class="entry-fields">
        <For each={WORLD_FIELDS}>
          {(field) => (
            <EditorNumberField
              disabled={props.disabled}
              label={field.label}
              name={`physics-${field.property}-${field.axis}`}
              step="any"
              value={vector(field.property)[field.axis]}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(value) => {
                const next = [...vector(field.property)] as [number, number]
                next[field.axis] = value
                // Gravity is a direction; it needs some length.
                if (field.property === 'wind' || next.some((part) => part !== 0)) {
                  apply(setPhysicsWorld(props.document, {[field.property]: next}))
                }
              }}
            />
          )}
        </For>
        <EditorNumberField
          disabled={props.disabled}
          label="계산 FPS"
          maximum={240}
          minimum={1}
          name="physics-fps"
          step={1}
          value={props.document.physics?.fps ?? DEFAULT_PUPPET_CHAIN_FPS}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onValueChange={(fps) => apply(setPhysicsWorld(props.document, {fps}))}
        />
      </div>
    </details>
  )
}
