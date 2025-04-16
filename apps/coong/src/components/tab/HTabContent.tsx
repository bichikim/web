import {
  ComponentProps,
  createMemo,
  mergeProps,
  Show,
  splitProps,
  useContext,
} from 'solid-js'
import {getId} from '@winter-love/solid-components'
import {TabContext} from './context'

export interface HTabContentProps extends ComponentProps<'div'> {
  name?: string
}

export const HTabContent = (props: HTabContentProps) => {
  const defaultProps = mergeProps({name: 'default'}, props)
  const [innerProps, restProps] = splitProps(defaultProps, ['children', 'name'])
  const {tabValue, id} = useContext(TabContext)

  const isActive = createMemo(() => tabValue() === innerProps.name)

  const tabId = createMemo(() => getId(id, innerProps.name))

  return (
    <div
      {...restProps}
      role="tabpanel"
      data-state={isActive() ? 'active' : 'inactive'}
      aria-labelledby={tabId()}
    >
      <Show when={isActive()}>{innerProps.children}</Show>
    </div>
  )
}
