import {ParentProps, splitProps, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type HCardProps<T extends ValidComponent = 'div'> = Omit<DynamicProps<T>, 'component' | 'children' | 'class'> &
  ParentProps & {
    /**
     * Render target element/component.
     * @default 'div'
     */
    class?: string
    component?: T
  }

export const HCard = <T extends ValidComponent = 'div'>(props: HCardProps<T>) => {
  const [innerProps, restProps] = splitProps(props, ['component', 'children'])

  return (
    <Dynamic {...restProps} component={innerProps.component ?? 'div'}>
      {innerProps.children}
    </Dynamic>
  )
}
