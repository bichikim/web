import {Select} from '@kobalte/core/select'
import {cva, cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {PSelectAppearance, PSelectOption} from './shared'

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

interface PSelectPartsProps<TValue extends string> {
  readonly accessibleLabel?: string
  readonly appearance: PSelectAppearance
  readonly clearDisabled?: boolean
  readonly clearLabel?: string
  readonly description?: string
  readonly getIconClass?: (icon: string) => string
  readonly hideLabel?: boolean
  readonly label: string
  readonly multiple?: boolean
  readonly onClear?: () => void
  readonly selectionLabel?: (options: ReadonlyArray<PSelectOption<TValue>>) => string
  readonly selectedIcon?: string
}

export const PSelectParts = <TValue extends string>(props: PSelectPartsProps<TValue>) => (
  <>
    <Show when={!props.hideLabel || props.accessibleLabel === undefined}>
      <Select.Label
        class={props.hideLabel ? 'sr-only' : 'text-xs font-650 leading-4 text-muted-foreground'}
        data-visually-hidden={props.hideLabel ? '' : undefined}
      >
        {props.label}
      </Select.Label>
    </Show>
    <Show when={props.description}>
      {(description) => (
        <Select.Description class="text-xs leading-5 text-muted-foreground">
          {description()}
        </Select.Description>
      )}
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
