import {createEffect, createUniqueId, JSX, Match, splitProps, Switch} from 'solid-js'

export type SSettingItemType = 'switch' | 'slider'

export interface SSettingItemProps<T extends SSettingItemType>
  extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string
  max?: T extends 'slider' ? number : never
  min?: T extends 'slider' ? number : never
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
            class="w-6 h-6"
            checked={typeof innerProps.value === 'boolean' ? innerProps.value : false}
            onChange={handleSwitchChange}
          />
        </Match>
        <Match when={innerProps.type === 'slider'}>
          <input
            type="range"
            id={id}
            class="w-full"
            min={innerProps.min ?? 0}
            max={innerProps.max ?? 1}
            value={typeof innerProps.value === 'number' ? innerProps.value : 1}
            onInput={handleSliderChange}
          />
        </Match>
      </Switch>
    </div>
  )
}
