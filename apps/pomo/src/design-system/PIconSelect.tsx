import {Select} from '@kobalte/core/select'
import {cx} from 'class-variance-authority'

import type {PSceneStyle} from '../features/focus-room-animation'
import {getPomoIconClass} from './icon-style'

export interface PIconSelectOption<TValue extends string> {
  readonly icon: string
  readonly label: string
  readonly value: TValue
}

export interface PIconSelectProps<TValue extends string> {
  readonly class?: string
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly PIconSelectOption<TValue>[]
  readonly sceneStyle?: PSceneStyle
  readonly value: TValue
}

export const PIconSelect = <TValue extends string>(props: PIconSelectProps<TValue>) => {
  const options = () => [...props.options]
  const selectedOption = () =>
    options().find((option) => option.value === props.value) ?? options()[0]

  return (
    <Select<PIconSelectOption<TValue>>
      class={cx('pomo-icon-select block', props.class)}
      disallowEmptySelection
      gutter={6}
      itemComponent={(itemProps) => (
        <Select.Item
          class={
            'grid min-h-10 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center ' +
            'gap-2.5 whitespace-nowrap rounded-3 px-3 ' +
            'py-2 text-sm font-600 leading-5 text-muted-foreground ' +
            'outline-none transition-[background-color_120ms_ease,color_120ms_ease] ' +
            'ui-highlighted:bg-secondary-soft ui-highlighted:text-foreground ' +
            'ui-selected:bg-primary-soft ui-selected:text-foreground ' +
            'motion-reduce:transition-none'
          }
          item={itemProps.item}
        >
          <span
            aria-hidden="true"
            class={cx(
              'size-5 text-highlight',
              getPomoIconClass(itemProps.item.rawValue.icon, props.sceneStyle),
            )}
          />
          <Select.ItemLabel>{itemProps.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator class="inline-flex text-primary">
            <span
              aria-hidden="true"
              class={cx(getPomoIconClass('i-tabler-check', props.sceneStyle), 'size-4')}
            />
          </Select.ItemIndicator>
        </Select.Item>
      )}
      onChange={(option) => {
        if (option) {
          props.onChange(option.value)
        }
      }}
      optionTextValue="label"
      optionValue="value"
      options={options()}
      placement="bottom-end"
      value={selectedOption()}
    >
      <Select.Trigger
        aria-label={`${props.label} ${selectedOption().label}`}
        class={
          'grid size-control-md border border-solid border-border backdrop-blur-surface ' +
          'hover:border-border-hover hover:bg-surface-interactive ' +
          'focus-visible:border-highlight focus-visible:bg-surface-interactive ' +
          'ui-expanded:border-highlight ui-expanded:bg-surface-interactive ' +
          'place-items-center rounded-control bg-surface ' +
          'text-highlight shadow-panel outline-none ' +
          'transition-[border-color_160ms_ease,background-color_160ms_ease] ' +
          'motion-reduce:transition-none'
        }
      >
        <span
          aria-hidden="true"
          class={cx('size-5', getPomoIconClass(selectedOption().icon, props.sceneStyle))}
        />
        <span class="sr-only">{selectedOption().label}</span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          class={
            'max-h-[min(18rem,var(--kb-popper-available-height))] w-max min-w-40 ' +
            'border border-solid border-border backdrop-blur-surface ' +
            'max-w-[calc(100vw-2rem)] overflow-hidden rounded-4 bg-surface-strong ' +
            'p-2 text-foreground shadow-panel ' +
            '[transform-origin:var(--kb-select-content-transform-origin)] ' +
            'animate-select-in motion-reduce:animate-none'
          }
        >
          <Select.Listbox class="grid max-h-[inherit] gap-0.5 overflow-y-auto outline-none" />
        </Select.Content>
      </Select.Portal>
      <Select.HiddenSelect />
    </Select>
  )
}
