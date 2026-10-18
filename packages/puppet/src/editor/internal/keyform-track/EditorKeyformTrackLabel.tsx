import {type JSX, Show} from 'solid-js'
import {isTwoDimensionalParameterBinding, type PuppetParameterValues} from '../../../deformation'
import {ParameterValueField} from '../ParameterValueField'
import {EditorParameterItem} from '../EditorParameterItem'
import type {EditorKeyformTrackProps} from './types'

const WHOLE_PERCENT = 100

export interface EditorKeyformTrackLabelProps extends Pick<
  EditorKeyformTrackProps,
  'active' | 'binding' | 'parameters' | 'values' | 'onBindingSelect' | 'onValueChange'
> {
  readonly footer?: JSX.Element
  readonly influence?: number
  readonly previewOnly?: boolean
  readonly onBindingDelete?: (bindingId: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onParameterNameChange?: (bindingId: string, parameterId: string, name: string) => void
}

export const EditorKeyformTrackLabel = (props: EditorKeyformTrackLabelProps) => {
  const firstParameter = () => props.parameters[0]
  const secondParameter = () => props.parameters[1]
  const handleValueChange = (axis: number, value: number) => {
    const values = (
      props.values ?? props.parameters.map((parameter) => parameter.defaultValue)
    ).map((current, index) =>
      index === axis ? value : current,
    ) as unknown as PuppetParameterValues
    if (!props.active) {
      props.onBindingSelect?.(props.binding.id)
    }
    props.onValueChange?.(values)
  }
  const groupName = () => {
    const {name} = props.binding
    return name?.replace(/[\s·]+/gu, '') === firstParameter()?.name.replace(/[\s·]+/gu, '')
      ? undefined
      : name
  }
  const influenceLabel = () =>
    `적용량 ${Number(((props.influence ?? 1) * WHOLE_PERCENT).toFixed(1))}%`

  return (
    <div
      class="keyform-track-label"
      role="group"
      aria-label={`${props.parameters.map((parameter) => parameter.name).join(' / ')} 파라미터`}
      classList={{'parameter-grid-label': isTwoDimensionalParameterBinding(props.binding)}}
    >
      <Show when={firstParameter()}>
        {(parameter) => (
          <EditorParameterItem
            footer={props.footer}
            groupName={groupName()}
            name={parameter().name}
            status={
              <span class="parameter-influence-status">
                {props.previewOnly ? '물리 입력 미리보기' : influenceLabel()}
              </span>
            }
            primaryControl={
              <ParameterValueField
                parameter={parameter()}
                value={props.values?.[0]}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) => handleValueChange(0, value)}
              />
            }
            secondaryControl={
              <Show when={secondParameter()}>
                {(secondary) => (
                  <ParameterValueField
                    parameter={secondary()}
                    value={props.values?.[1]}
                    onEditEnd={props.onEditEnd}
                    onEditStart={props.onEditStart}
                    onValueChange={(value) => handleValueChange(1, value)}
                  />
                )}
              </Show>
            }
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
          />
        )}
      </Show>
    </div>
  )
}
