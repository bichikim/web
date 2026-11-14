import {Index} from 'solid-js'
import {EditorButton, EditorCheckbox, EditorNumberField, EditorSelect} from '../../../design-system'
import {PUPPET_PHYSICS_AXES} from '../../../player'
import {createChainInput, patchItem} from '../physics-chains'
import type {ChainProps} from './types'
import {AXIS_LABELS, isAxis, parameterLabel, parameterOptions, RATIO_STEP} from './fields'

export const PhysicsChainInputs = (props: ChainProps) => (
  <fieldset class="entry-fields">
    <legend>입력</legend>
    <Index each={props.chain.inputs}>
      {(input, index) => (
        <div class="entry-fields">
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 파라미터`}
            optionLabel={parameterLabel(props.document)}
            options={parameterOptions(props.document)}
            value={input().parameterId}
            onChange={(parameterId) =>
              props.update((chain) => ({
                ...chain,
                inputs: patchItem(chain.inputs, index, {parameterId}),
              }))
            }
          />
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 종류`}
            optionLabel={(axis) => AXIS_LABELS[isAxis(axis) ?? 'x']}
            options={PUPPET_PHYSICS_AXES}
            value={input().axis}
            onChange={(value) => {
              const axis = isAxis(value)
              if (axis !== undefined) {
                props.update((chain) => ({
                  ...chain,
                  inputs: patchItem(chain.inputs, index, {axis}),
                }))
              }
            }}
          />
          <EditorNumberField
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 영향도`}
            maximum={1}
            minimum={0}
            name={`${props.chain.id}-input-${index}-weight`}
            step={RATIO_STEP}
            value={input().weight}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
            onValueChange={(weight) =>
              props.update((chain) => ({
                ...chain,
                inputs: patchItem(chain.inputs, index, {weight}),
              }))
            }
          />
          <EditorCheckbox
            checked={input().reflect === true}
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 반전`}
            onChange={(reflect) =>
              props.update((chain) => ({
                ...chain,
                inputs: patchItem(chain.inputs, index, {reflect}),
              }))
            }
          />
          <EditorButton
            aria-label={`${props.chain.id} 입력 ${index + 1} 삭제`}
            disabled={props.disabled || props.chain.inputs.length === 1}
            onClick={() =>
              props.update((chain) => ({
                ...chain,
                inputs: chain.inputs.filter((_, at) => at !== index),
              }))
            }
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={props.disabled || createChainInput(props.document, props.chain) === undefined}
      onClick={() => {
        const input = createChainInput(props.document, props.chain)
        if (input !== undefined) {
          props.update((chain) => ({...chain, inputs: [...chain.inputs, input]}))
        }
      }}
    >
      입력 추가
    </EditorButton>
  </fieldset>
)
