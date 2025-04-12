import {ComponentProps, JSX, VoidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type HTabListProps<T extends VoidComponent> = Omit<
  DynamicProps<T>,
  'component' | 'children' | 'class'
> & {
  children?: JSX.Element
  class?: string
  component?: T
}

export const HTabList = <T extends VoidComponent>(props: HTabListProps<T>) => {
  return (
    <Dynamic {...props} component={props.component ?? 'div'} role="tablist">
      {props.children}
    </Dynamic>
  )
}
