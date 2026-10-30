import {For} from 'solid-js'
import {EditorButton, EditorNumberField, EditorRangeInput} from '@winter-love/puppet/editor'
import type {PuppetDocument} from '@winter-love/puppet/player'
import type {RuntimeControls} from './use-runtime-controls'

interface ParameterControlsProps {
  readonly debug: boolean
  readonly document: PuppetDocument
  readonly controls: RuntimeControls
}
export const ParameterControls = (props: ParameterControlsProps) => (
  <details class="puppet-runtime-section" open={props.debug}>
    <summary>수동 파라미터</summary>
    <EditorButton onClick={props.controls.clearManual}>전체 해제</EditorButton>
    <For each={props.document.parameters ?? []}>
      {(parameter) => {
        const value = () => props.controls.values()[parameter.id] ?? parameter.defaultValue
        const handleInput = (event: InputEvent & {currentTarget: HTMLInputElement}) =>
          props.controls.setManual(parameter.id, event.currentTarget.valueAsNumber)
        return (
          <div class="puppet-runtime-parameter">
            <label for={`parameter-${parameter.id}`}>{parameter.name}</label>
            <EditorRangeInput
              id={`parameter-${parameter.id}`}
              aria-label={`${parameter.name} 수동 조절`}
              min={parameter.minimum}
              max={parameter.maximum}
              step="any"
              value={value()}
              onInput={handleInput}
            />
            <EditorNumberField
              label={`${parameter.name} 값`}
              value={value()}
              minimum={parameter.minimum}
              maximum={parameter.maximum}
              step={0.01}
              onValueChange={(value) => props.controls.setManual(parameter.id, value)}
            />
            <EditorButton
              disabled={props.controls.manual()[parameter.id] === undefined}
              onClick={() => props.controls.setManual(parameter.id, undefined)}
            >
              해제
            </EditorButton>
          </div>
        )
      }}
    </For>
  </details>
)
