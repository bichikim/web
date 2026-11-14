import {For, Index} from 'solid-js'
import {EditorButton, EditorCheckbox, EditorNumberField, EditorSelect} from '../../../design-system'
import {PUPPET_PHYSICS_AXES} from '../../../player'
import {createChainOutput, patchItem} from '../physics-chains'
import {AXIS_LABELS, isAxis, parameterLabel, parameterOptions, RATIO_STEP} from './fields'
import type {ChainProps} from './types'

const OUTPUT_NUMBER_FIELDS = [
  {label: '배율', property: 'scale', step: 0.1},
  {label: '영향도', maximum: 1, minimum: 0, property: 'weight', step: RATIO_STEP},
] as const

export const PhysicsChainOutputs = (props: ChainProps) => (
  <fieldset class="entry-fields">
    <legend>출력</legend>
    <Index each={props.chain.outputs}>
      {(output, index) => (
        <div class="entry-fields">
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 파라미터`}
            optionLabel={parameterLabel(props.document)}
            options={parameterOptions(props.document)}
            value={output().parameterId}
            onChange={(parameterId) =>
              props.update((chain) => ({
                ...chain,
                outputs: patchItem(chain.outputs, index, {parameterId}),
              }))
            }
          />
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 진자`}
            optionLabel={(value) => `진자 ${Number(value) + 1}`}
            options={props.chain.pendulums.map((_, at) => String(at))}
            value={String(output().pendulumIndex)}
            onChange={(value) =>
              props.update((chain) => ({
                ...chain,
                outputs: patchItem(chain.outputs, index, {pendulumIndex: Number(value)}),
              }))
            }
          />
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 종류`}
            optionLabel={(axis) => AXIS_LABELS[isAxis(axis) ?? 'x']}
            options={PUPPET_PHYSICS_AXES}
            value={output().axis}
            onChange={(value) => {
              const axis = isAxis(value)
              if (axis !== undefined) {
                props.update((chain) => ({
                  ...chain,
                  outputs: patchItem(chain.outputs, index, {axis}),
                }))
              }
            }}
          />
          <For each={OUTPUT_NUMBER_FIELDS}>
            {(field) => (
              <EditorNumberField
                disabled={props.disabled}
                label={`${props.chain.id} 출력 ${index + 1} ${field.label}`}
                maximum={'maximum' in field ? field.maximum : undefined}
                minimum={'minimum' in field ? field.minimum : undefined}
                name={`${props.chain.id}-output-${index}-${field.property}`}
                step={field.step}
                value={output()[field.property]}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.update((chain) => ({
                    ...chain,
                    outputs: patchItem(chain.outputs, index, {[field.property]: value}),
                  }))
                }
              />
            )}
          </For>
          <EditorCheckbox
            checked={output().reflect === true}
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 반전`}
            onChange={(reflect) =>
              props.update((chain) => ({
                ...chain,
                outputs: patchItem(chain.outputs, index, {reflect}),
              }))
            }
          />
          <EditorButton
            aria-label={`${props.chain.id} 출력 ${index + 1} 삭제`}
            disabled={props.disabled}
            onClick={() =>
              props.update((chain) => ({
                ...chain,
                outputs: chain.outputs.filter((_, at) => at !== index),
              }))
            }
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={props.disabled || createChainOutput(props.document, props.chain) === undefined}
      onClick={() => {
        const output = createChainOutput(props.document, props.chain)
        if (output !== undefined) {
          props.update((chain) => ({...chain, outputs: [...chain.outputs, output]}))
        }
      }}
    >
      출력 추가
    </EditorButton>
  </fieldset>
)
