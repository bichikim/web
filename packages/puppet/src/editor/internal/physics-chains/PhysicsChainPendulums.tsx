import {For, Index} from 'solid-js'
import {EditorButton, EditorNumberField} from '../../../design-system'
import {DEFAULT_CHAIN_PENDULUM, patchItem} from '../physics-chains'
import {RATIO_STEP} from './fields'
import type {ChainProps} from './types'

const PENDULUM_FIELDS = [
  {label: '길이', minimum: 0.01, property: 'length', step: 1},
  {label: '흔들림(이동성)', maximum: 1, minimum: 0, property: 'mobility', step: RATIO_STEP},
  {label: '반응 속도', minimum: 0.01, property: 'reaction', step: 0.1},
  {label: '가속도', property: 'acceleration', step: 0.1},
] as const

export const PhysicsChainPendulums = (props: ChainProps) => (
  <fieldset class="entry-fields">
    <legend>진자 (위에서 아래로)</legend>
    <Index each={props.chain.pendulums}>
      {(pendulum, index) => (
        <div class="entry-fields">
          <For each={PENDULUM_FIELDS}>
            {(field) => (
              <EditorNumberField
                disabled={props.disabled}
                label={`${props.chain.id} 진자 ${index + 1} ${field.label}`}
                maximum={'maximum' in field ? field.maximum : undefined}
                minimum={'minimum' in field ? field.minimum : undefined}
                name={`${props.chain.id}-pendulum-${index}-${field.property}`}
                step={field.step}
                value={pendulum()[field.property]}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.update((chain) => ({
                    ...chain,
                    pendulums: patchItem(chain.pendulums, index, {[field.property]: value}),
                  }))
                }
              />
            )}
          </For>
          <EditorButton
            aria-label={`${props.chain.id} 진자 ${index + 1} 삭제`}
            disabled={props.disabled || props.chain.pendulums.length === 1}
            onClick={() =>
              props.update((chain) => ({
                ...chain,
                outputs: chain.outputs
                  .filter((output) => output.pendulumIndex !== index)
                  .map((output) =>
                    output.pendulumIndex > index
                      ? {...output, pendulumIndex: output.pendulumIndex - 1}
                      : output,
                  ),
                pendulums: chain.pendulums.filter((_, at) => at !== index),
              }))
            }
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={props.disabled}
      onClick={() =>
        props.update((chain) => ({
          ...chain,
          pendulums: [...chain.pendulums, DEFAULT_CHAIN_PENDULUM],
        }))
      }
    >
      진자 추가
    </EditorButton>
  </fieldset>
)
