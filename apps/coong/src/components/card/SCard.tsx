import {mergeProps, splitProps, ValidComponent} from 'solid-js'
import {HCard, HCardProps} from './HCard'
import {ContainerStyleProps, containerStyles} from '../container/container.style'

export type SCardProps<T extends ValidComponent = 'div'> = HCardProps<T> & ContainerStyleProps

export const SCard = <T extends ValidComponent = 'div'>(props: SCardProps<T>) => {
  const defaultProps = mergeProps(
    {
      glass: true,
    },
    props,
  )

  const [innerProps, restProps] = splitProps(defaultProps, ['class', 'glass', 'size'])

  return (
    <HCard
      {...restProps}
      class={containerStyles({
        class: innerProps.class,
        cursor: false,
        glass: innerProps.glass,
        size: innerProps.size,
      })}
    />
  )
}
