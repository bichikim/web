import {Select, type SelectRootItemComponentProps} from '@kobalte/core/select'
import {cva, cx} from 'class-variance-authority'
import {type JSX, Match, Show, Switch} from 'solid-js'

type PSelectAppearance = 'default' | 'detailed' | 'icon'

const selectItemClasses = cva(
  'min-h-10 min-w-0 cursor-pointer items-center gap-3 rounded-3 px-3 py-2 outline-none ' +
    'transition-[background-color_120ms_ease,color_120ms_ease] ' +
    'ui-highlighted:bg-secondary-soft motion-reduce:transition-none',
  {
    defaultVariants: {appearance: 'default'},
    variants: {
      appearance: {
        default:
          'flex justify-between text-sm font-600 leading-5 text-muted-foreground ' +
          'ui-highlighted:text-foreground ui-selected:bg-primary-soft ui-selected:text-foreground',
        detailed: 'grid grid-cols-[auto_minmax(0,_1fr)] text-[0.6875rem] text-foreground',
        icon:
          'grid grid-cols-[auto_minmax(0,_1fr)_auto] whitespace-nowrap text-sm font-600 ' +
          'leading-5 text-muted-foreground ui-highlighted:text-foreground ' +
          'ui-selected:bg-primary-soft ui-selected:text-foreground',
      },
    },
  },
)

const selectItemIndicatorClasses = cva('inline-flex flex-none items-center justify-center', {
  defaultVariants: {appearance: 'default'},
  variants: {
    appearance: {
      default: 'order-2 text-primary',
      detailed:
        'order-1 size-4 rounded border border-solid border-border text-transparent ' +
        'ui-selected:border-primary ui-selected:bg-primary ui-selected:text-foreground',
      icon: 'order-3 text-primary',
    },
  },
})

const selectItemTextClasses = cva('min-w-0', {
  defaultVariants: {appearance: 'default'},
  variants: {
    appearance: {
      default: 'order-1 overflow-hidden text-ellipsis whitespace-nowrap',
      detailed: 'order-2 grid overflow-hidden gap-[0.2rem]',
      icon: 'order-2 overflow-hidden text-ellipsis whitespace-nowrap',
    },
  },
})

const SELECT_ITEM_DESCRIPTION_CLASS =
  'overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground text-[0.6rem]'

const selectContentClasses = cva(
  'max-h-[min(18rem,var(--kb-popper-available-height))] border border-solid border-border ' +
    'backdrop-blur-surface overflow-hidden rounded-4 bg-surface-strong p-2 text-foreground ' +
    'shadow-panel [transform-origin:var(--kb-select-content-transform-origin)] ' +
    'animate-select-in motion-reduce:animate-none',
  {
    defaultVariants: {appearance: 'default'},
    variants: {
      appearance: {
        default: 'w-[var(--kb-popper-anchor-width)]',
        detailed: 'w-[var(--kb-popper-anchor-width)]',
        icon: 'w-max min-w-40 max-w-[calc(100vw-2rem)]',
      },
    },
  },
)

const selectTriggerClasses = cva(
  'border border-solid border-border backdrop-blur-surface group overflow-hidden rounded-control ' +
    'bg-surface text-foreground outline-none ' +
    'transition-[border-color_160ms_ease,background-color_160ms_ease] ' +
    'hover:border-border-hover focus-visible:border-highlight ui-expanded:border-highlight ' +
    'disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none',
  {
    defaultVariants: {appearance: 'default'},
    variants: {
      appearance: {
        default:
          'flex h-control-md w-full min-w-0 max-w-full items-center justify-between gap-3 ' +
          'px-4 text-sm font-650 leading-5',
        detailed:
          'flex h-control-md w-full min-w-0 max-w-full items-center justify-between gap-3 ' +
          'px-4 text-sm font-650 leading-5',
        icon:
          'grid size-control-md place-items-center text-highlight shadow-panel ' +
          'hover:bg-surface-interactive focus-visible:bg-surface-interactive ' +
          'ui-expanded:bg-surface-interactive',
      },
    },
  },
)

export interface PSelectOption<TValue extends string> {
  readonly description?: string
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}

interface PSelectSharedProps<TValue extends string> {
  readonly accessibleLabel?: string
  readonly appearance?: PSelectAppearance
  readonly class?: string
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

interface PSelectPartsProps<TValue extends string> {
  readonly accessibleLabel?: string
  readonly appearance: PSelectAppearance
  readonly clearDisabled?: boolean
  readonly clearLabel?: string
  readonly getIconClass?: (icon: string) => string
  readonly hideLabel?: boolean
  readonly label: string
  readonly multiple?: boolean
  readonly onClear?: () => void
  readonly selectionLabel?: (options: ReadonlyArray<PSelectOption<TValue>>) => string
  readonly selectedIcon?: string
}

interface PSelectItemProps<TValue extends string> extends SelectRootItemComponentProps<
  PSelectOption<TValue>
> {
  readonly appearance: PSelectAppearance
  readonly forceIndicator?: boolean
  readonly getIconClass?: (icon: string) => string
}

const PSelectItem = <TValue extends string>(props: PSelectItemProps<TValue>) => {
  const indicatorIconClass = () => {
    switch (props.appearance) {
      case 'default':
        return 'i-tabler-check size-4'
      case 'detailed':
        return 'i-tabler-check size-3.5'
      case 'icon':
        return cx(props.getIconClass?.('i-tabler-check') ?? 'i-tabler-check', 'size-4')
    }
  }

  return (
    <Select.Item class={selectItemClasses({appearance: props.appearance})} item={props.item}>
      <Show when={props.appearance === 'icon' ? props.item.rawValue.icon : undefined}>
        {(icon) => (
          <span
            aria-hidden="true"
            class={cx('order-1 size-5 text-highlight', props.getIconClass?.(icon()) ?? icon())}
          />
        )}
      </Show>
      <span class={selectItemTextClasses({appearance: props.appearance})}>
        <Select.ItemLabel class="block overflow-hidden text-ellipsis whitespace-nowrap">
          {props.item.rawValue.label}
        </Select.ItemLabel>
        <Show when={props.item.rawValue.description}>
          {(description) => (
            <Select.ItemDescription class={SELECT_ITEM_DESCRIPTION_CLASS}>
              {description()}
            </Select.ItemDescription>
          )}
        </Show>
      </span>
      <Select.ItemIndicator
        class={selectItemIndicatorClasses({appearance: props.appearance})}
        forceMount={props.forceIndicator}
      >
        <span aria-hidden="true" class={indicatorIconClass()} />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

const PSelectParts = <TValue extends string>(props: PSelectPartsProps<TValue>) => (
  <>
    <Show when={!props.hideLabel || props.accessibleLabel === undefined}>
      <Select.Label
        class={props.hideLabel ? 'sr-only' : 'text-xs font-650 leading-4 text-muted-foreground'}
        data-visually-hidden={props.hideLabel ? '' : undefined}
      >
        {props.label}
      </Select.Label>
    </Show>
    <Select.Trigger
      aria-label={props.accessibleLabel}
      class={selectTriggerClasses({appearance: props.appearance})}
    >
      <Show
        when={props.appearance === 'icon' ? props.selectedIcon : undefined}
        fallback={
          <Select.Value<
            PSelectOption<TValue>
          > class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {(state) =>
              props.multiple
                ? (props.selectionLabel?.(state.selectedOptions()) ??
                  `${state.selectedOptions().length}개 선택`)
                : state.selectedOption().label
            }
          </Select.Value>
        }
      >
        {(selectedIcon) => (
          <span
            aria-hidden="true"
            class={cx('size-5', props.getIconClass?.(selectedIcon()) ?? selectedIcon())}
          />
        )}
      </Show>
      <Show when={props.appearance !== 'icon'}>
        <Select.Icon
          class={
            'inline-flex flex-none items-center justify-center text-highlight ' +
            'transition-transform duration-160 ui-group-expanded:rotate-180 motion-reduce:transition-none'
          }
        >
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </Select.Icon>
      </Show>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content class={selectContentClasses({appearance: props.appearance})}>
        <Show when={props.multiple ? props.clearLabel : undefined}>
          {(clearLabel) => (
            <button
              class={
                'flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-3 border-0 bg-transparent ' +
                'px-3 py-2 text-left text-sm font-600 leading-5 text-muted-foreground outline-none ' +
                'transition-[background-color_120ms_ease,color_120ms_ease] ' +
                'hover:bg-secondary-soft hover:text-foreground focus-visible:bg-secondary-soft ' +
                'focus-visible:text-foreground disabled:cursor-default disabled:opacity-45 ' +
                'motion-reduce:transition-none'
              }
              disabled={props.clearDisabled}
              onClick={() => props.onClear?.()}
              type="button"
            >
              <span aria-hidden="true" class="i-tabler-unlink size-4" />
              <span>{clearLabel()}</span>
            </button>
          )}
        </Show>
        <Select.Listbox class="grid max-h-[inherit] gap-0.5 overflow-y-auto outline-none" />
      </Select.Content>
    </Select.Portal>
    <Select.HiddenSelect />
  </>
)

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
