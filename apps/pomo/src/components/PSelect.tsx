import {Select} from '@kobalte/core/select'
import {cx} from 'class-variance-authority'
import {type JSX, Match, Switch} from 'solid-js'
import {PSelectItem} from './p-select/Item'
import {PSelectParts} from './p-select/Parts'
import type {PSelectAppearance, PSelectOption} from './p-select/shared'
export type {PSelectOption} from './p-select/shared'

interface PSelectSharedProps<TValue extends string> {
  readonly accessibleLabel?: string
  readonly appearance?: PSelectAppearance
  readonly class?: string
  readonly description?: string
  readonly disabled?: boolean
  readonly getIconClass?: (icon: string) => string
  readonly hideLabel?: boolean
  readonly placeholder?: string
  readonly label: string
  readonly options: ReadonlyArray<PSelectOption<TValue>>
}

export interface PSelectSingleProps<TValue extends string> extends PSelectSharedProps<TValue> {
  readonly multiple?: false
  readonly onChange: (value: TValue) => void
  readonly value: TValue
}

export interface PSelectMultipleProps<TValue extends string> extends PSelectSharedProps<TValue> {
  readonly clearLabel?: string
  readonly multiple: true
  readonly onChange: (values: ReadonlyArray<TValue>) => void
  readonly selectionLabel?: (options: ReadonlyArray<PSelectOption<TValue>>) => string
  readonly value: ReadonlyArray<TValue>
}

export type PSelectProps<TValue extends string> =
  | PSelectMultipleProps<TValue>
  | PSelectSingleProps<TValue>

const renderSingleSelect = <TValue extends string>(props: PSelectSingleProps<TValue>) => {
  const options = () => [...props.options]
  const selectedOption = () =>
    options().find((option) => option.value === props.value) ?? options()[0]
  const appearance = () => props.appearance ?? 'default'

  return (
    <Select<PSelectOption<TValue>>
      class={cx(
        appearance() === 'icon' ? 'pomo-icon-select block' : 'grid w-full min-w-0 gap-1.5',
        props.class,
      )}
      disallowEmptySelection
      disabled={props.disabled}
      gutter={6}
      itemComponent={(itemProps) => (
        <PSelectItem
          appearance={appearance()}
          getIconClass={props.getIconClass}
          item={itemProps.item}
        />
      )}
      onChange={(option) => {
        if (option) {
          props.onChange(option.value)
        }
      }}
      optionTextValue="label"
      optionValue="value"
      options={options()}
      placement={appearance() === 'icon' ? 'bottom-end' : 'bottom-start'}
      placeholder={props.placeholder}
      sameWidth
      value={selectedOption()}
    >
      <PSelectParts
        accessibleLabel={
          props.accessibleLabel ??
          (appearance() === 'icon' ? `${props.label} ${selectedOption()?.label ?? ''}` : undefined)
        }
        appearance={appearance()}
        description={props.description}
        getIconClass={props.getIconClass}
        hideLabel={props.hideLabel}
        label={props.label}
        selectedIcon={selectedOption()?.icon}
      />
    </Select>
  )
}

const renderMultipleSelect = <TValue extends string>(props: PSelectMultipleProps<TValue>) => {
  const options = () => [...props.options]
  const selectedOptions = () =>
    props.value.flatMap((value) => {
      const option = options().find((item) => item.value === value)
      return option === undefined ? [] : [option]
    })
  const appearance = () => props.appearance ?? 'default'

  return (
    <Select<PSelectOption<TValue>>
      class={cx('grid w-full min-w-0 gap-1.5', props.class)}
      closeOnSelection={false}
      disabled={props.disabled}
      gutter={6}
      itemComponent={(itemProps) => (
        <PSelectItem
          appearance={appearance()}
          forceIndicator={appearance() === 'detailed'}
          getIconClass={props.getIconClass}
          item={itemProps.item}
        />
      )}
      multiple
      onChange={(nextOptions) => props.onChange(nextOptions.map((option) => option.value))}
      optionTextValue="label"
      optionValue="value"
      options={options()}
      placement="bottom-start"
      placeholder={props.placeholder}
      sameWidth
      value={selectedOptions()}
    >
      <PSelectParts
        accessibleLabel={props.accessibleLabel}
        appearance={appearance()}
        clearDisabled={selectedOptions().length === 0}
        clearLabel={props.clearLabel}
        description={props.description}
        getIconClass={props.getIconClass}
        hideLabel={props.hideLabel}
        label={props.label}
        multiple
        onClear={() => props.onChange([])}
        selectionLabel={props.selectionLabel}
      />
    </Select>
  )
}

export const PSelect = <TValue extends string>(props: PSelectProps<TValue>): JSX.Element => {
  const multipleProps = () => (props.multiple === true ? props : undefined)
  const singleProps = () => (props.multiple === true ? undefined : props)

  return (
    <Switch>
      <Match when={multipleProps()} keyed>
        {(currentProps) => renderMultipleSelect(currentProps)}
      </Match>
      <Match when={singleProps()} keyed>
        {(currentProps) => renderSingleSelect(currentProps)}
      </Match>
    </Switch>
  )
}
