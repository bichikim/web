import {For, Show} from 'solid-js'
import {EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetParameterValues} from '../../deformation'
import type {PuppetParameter} from '../../player/document'
import {resolveParameterValue} from '../../player/parameter-value'

interface ParameterValueFieldsProps {
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values?: PuppetParameterValues
}

export const ParameterValueFields = (props: ParameterValueFieldsProps) => {
  const updateAxisValue = (axis: number, value: number) => {
    const values = [
      ...(props.values ?? props.parameters.map((parameter) => parameter.defaultValue)),
    ]
    values[axis] = value
    props.onValueChange?.(values as unknown as PuppetParameterValues)
  }

  return (
    <div class="keyform-row-values">
      <For each={props.parameters}>
        {(parameter, index) => (
          <label class="keyform-row-value">
            <span>{parameter.name}</span>
            <Show
              when={parameter.options}
              fallback={
                <EditorNumberField
                  label={`${parameter.name} 값`}
                  maximum={parameter.maximum}
                  minimum={parameter.minimum}
                  value={props.values?.[index()] ?? parameter.defaultValue}
                  onEditEnd={props.onEditEnd}
                  onEditStart={props.onEditStart}
                  onValueChange={(value) => updateAxisValue(index(), value)}
                />
              }
            >
              {(options) => (
                <EditorSelect
                  label={`${parameter.name} 값`}
                  options={options().map((option) => String(option.value))}
                  optionLabel={(value) =>
                    options().find((option) => option.value === Number(value))?.label ?? value
                  }
                  value={String(resolveParameterValue(parameter, props.values?.[index()]))}
                  onChange={(value) => updateAxisValue(index(), Number(value))}
                />
              )}
            </Show>
          </label>
        )}
      </For>
    </div>
  )
}
