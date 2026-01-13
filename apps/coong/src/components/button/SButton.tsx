import {Component, splitProps, ValidComponent} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'
import {ContainerStyleProps, containerStyles} from '../container/container.style'

export type SButtonProps<T extends ValidComponent = 'button'> = HButtonProps<T> &
  Omit<ContainerStyleProps, 'loadingAnimation' | 'loading'>

export const SButton: Component<SButtonProps> = (props) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'glass',
    'size',
    'color',
    'flat',
    'outline',
    'wild',
    'children',
    'fit',
    'preventLoadingPulse',
  ])

  return (
    <HButton
      {...restProps}
      class={containerStyles({
        class: innerProps.class ?? 'relative',
        color: innerProps.color,
        cursor: true,
        fit: innerProps.fit,
        flat: innerProps.flat,
        glass: innerProps.glass,
        outline: innerProps.outline,
        preventLoadingPulse: innerProps.preventLoadingPulse,
        size: innerProps.size,
        wild: innerProps.wild ?? true,
      })}
    >
      {innerProps.children}
    </HButton>
  )
}
