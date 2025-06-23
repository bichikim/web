import {cva} from 'class-variance-authority'
import {Component, createMemo, splitProps} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'
import {buttonStyles, SButtonStyleProps} from './s-button.style'

export type SButtonProps = HButtonProps & Omit<SButtonStyleProps, 'loadingAnimation' | 'loading'>

export const SButton: Component<SButtonProps> = (props) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'glass',
    'size',
    'color',
    'flat',
    'outline',
    'children',
    'fit',
  ])

  return (
    <HButton
      {...restProps}
      class={buttonStyles({
        class: innerProps.class ?? 'relative',
        color: innerProps.color,
        fit: innerProps.fit,
        flat: innerProps.flat,
        glass: innerProps.glass,
        outline: innerProps.outline,
        size: innerProps.size,
      })}
    >
      {innerProps.children}
    </HButton>
  )
}
