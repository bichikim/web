import {Select, type SelectRootItemComponentProps} from '@kobalte/core/select'
import {cva, cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {PSelectAppearance, PSelectOption} from './shared'

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

interface PSelectItemProps<TValue extends string> extends SelectRootItemComponentProps<
  PSelectOption<TValue>
> {
  readonly appearance: PSelectAppearance
  readonly forceIndicator?: boolean
  readonly getIconClass?: (icon: string) => string
}

export const PSelectItem = <TValue extends string>(props: PSelectItemProps<TValue>) => {
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
