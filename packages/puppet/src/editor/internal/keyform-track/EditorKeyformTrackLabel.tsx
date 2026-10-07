import {type JSX, Show} from 'solid-js'
import {isTwoDimensionalParameterBinding, type PuppetParameterValues} from '../../../deformation'
import {ParameterValueFields} from '../ParameterValueFields'
import {EditorParameterItem} from '../EditorParameterItem'
import type {EditorKeyformTrackProps} from './types'

export interface EditorKeyformTrackLabelProps extends Pick<
  EditorKeyformTrackProps,
  'active' | 'binding' | 'parameters' | 'values' | 'onBindingSelect' | 'onValueChange'
> {
  readonly footer?: JSX.Element
  readonly onBindingDelete?: (bindingId: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onParameterNameChange?: (bindingId: string, parameterId: string, name: string) => void
}

export const EditorKeyformTrackLabel = (props: EditorKeyformTrackLabelProps) => {
  const firstParameter = () => props.parameters[0]
  const secondParameter = () => props.parameters[1]
  const handleValueChange = (values: PuppetParameterValues) => {
    if (!props.active) {
      props.onBindingSelect?.(props.binding.id)
    }
    props.onValueChange?.(values)
  }

  return (
    <div
      class="keyform-track-label"
      classList={{'parameter-grid-label': isTwoDimensionalParameterBinding(props.binding)}}
    >
      <Show when={firstParameter()}>
        {(parameter) => (
          <EditorParameterItem
            footer={props.footer}
            groupName={props.binding.name}
            name={parameter().name}
            pressed={props.active}
            secondaryName={secondParameter()?.name}
            onDelete={
              props.onBindingDelete === undefined
                ? undefined
                : () => props.onBindingDelete?.(props.binding.id)
            }
            onNameChange={(name) =>
              props.onParameterNameChange?.(props.binding.id, parameter().id, name)
            }
            onSecondaryNameChange={(name) =>
              props.onParameterNameChange?.(props.binding.id, secondParameter()!.id, name)
            }
            onSelect={() => props.onBindingSelect?.(props.binding.id)}
          >
            <ParameterValueFields
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={handleValueChange}
              parameters={props.parameters}
              values={props.values}
            />
          </EditorParameterItem>
        )}
      </Show>
    </div>
  )
}
