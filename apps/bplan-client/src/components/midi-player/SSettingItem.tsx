import {createUniqueId, JSX, Match, splitProps, Switch} from 'solid-js'

export type SSettingItemType = 'switch' | 'slider' | 'button'

export interface SSettingItemProps<T extends SSettingItemType>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  label: string
  max?: T extends 'slider' ? number : never
  min?: T extends 'slider' ? number : never
  onClick?: () => void
  onValueChange?: (value: T extends 'switch' ? boolean : number) => void
  type: T
  value?: T extends 'switch' ? boolean : number
}

export function SSettingItem<T extends SSettingItemType>(props: SSettingItemProps<T>) {
  const [innerProps, restProps] = splitProps(props, [
    'label',
    'type',
    'value',
    'min',
    'max',
    'onValueChange',
    'onClick',
  ])
  const id = createUniqueId()

  const handleSwitchChange = (event: Event) => {
    innerProps.onValueChange?.((event.target as HTMLInputElement).checked as any)
  }

  const handleSliderChange = (event: Event) => {
    if (innerProps.type === 'slider') {
      innerProps.onValueChange?.(Number((event.target as HTMLInputElement).value) as any)
    }
  }

  const handleClick = () => {
    innerProps.onClick?.()
  }

  return (
    <div {...restProps} class="flex items-center justify-start gap-2">
      <label class="text-nowrap text-4" for={id}>
        {innerProps.label}
      </label>
      <Switch>
        <Match when={innerProps.type === 'switch'}>
          <input
            type="checkbox"
            id={id}
            class="w-6 h-6 touch-none"
            checked={typeof innerProps.value === 'boolean' ? innerProps.value : false}
            onChange={handleSwitchChange}
          />
        </Match>
        <Match when={innerProps.type === 'slider'}>
          <input
            type="range"
            id={id}
            class="w-full touch-none"
            min={innerProps.min ?? 0}
            max={innerProps.max ?? 1}
            value={typeof innerProps.value === 'number' ? innerProps.value : 1}
            onInput={handleSliderChange}
          />
        </Match>
        <Match when={innerProps.type === 'button'}>
          <button class="p-2 touch-none" onClick={handleClick}>
            Run
          </button>
        </Match>
      </Switch>
    </div>
  )
}
