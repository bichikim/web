import {cva} from 'class-variance-authority'
import {Component, createMemo, splitProps} from 'solid-js'
import {HButton, HButtonProps} from '@winter-love/solid-components'
import {buttonStyles, SButtonStyleProps} from './s-button.style'

export type SButtonProps = HButtonProps & {
  loading?: number | boolean
  preventLoadingDisabled?: boolean
} & Omit<SButtonStyleProps, 'loadingAnimation' | 'loading'>

export const SButton: Component<SButtonProps> = (props) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'glass',
    'size',
    'color',
    'flat',
    'outline',
    'disabled',
    'preventLoadingDisabled',
    'children',
    'fit',
  ])

  const isLoading = createMemo(() => {
    if (typeof innerProps.loading === 'number') {
      return innerProps.loading > 0
    }

    return Boolean(props.loading)
  })

  // const style = createMemo(() => {
  //   if (typeof innerProps.loading === 'number') {
  //     return {
  //       '--var-progress-percent': `${props.loading}%`,
  //     }
  //   }
  // })

  // const isLoadingAnimation = createMemo(() => {
  //   return innerProps.loading === true
  // })

  // const isDisabled = createMemo(() => {
  //   if (isLoading() && !innerProps.preventLoadingDisabled) {
  //     return true
  //   }

  //   return innerProps.disabled
  // })

  return (
    <HButton
      {...restProps}
      class={buttonStyles({
        class: innerProps.class ?? 'relative',
        color: innerProps.color,
        fit: innerProps.fit,
        flat: innerProps.flat,
        glass: innerProps.glass,
        // loadingAnimation: isLoadingAnimation(),
        outline: innerProps.outline,
        size: innerProps.size,
      })}
    >
      {innerProps.children}
    </HButton>
  )
}
