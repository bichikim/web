import {createUniqueId, JSX, Match, splitProps, Switch} from 'solid-js'

export interface SSettingItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string
  type: 'switch' | 'slider'
  value?: boolean | number
}

export const SSettingItem = (props: SSettingItemProps) => {
  const [innerProps, restProps] = splitProps(props, ['label', 'type', 'value'])
  const id = createUniqueId()

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
          />
        </Match>
        <Match when={innerProps.type === 'slider'}>
          <input type="range" id={id} class="w-full" />
        </Match>
      </Switch>
    </div>
  )
}
