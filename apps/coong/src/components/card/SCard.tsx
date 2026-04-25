import {cva} from 'class-variance-authority'
import {mergeProps, splitProps, ValidComponent} from 'solid-js'
import {HCard, HCardProps} from './HCard'
import {ContainerStyleProps, containerStyles} from '../container/container.style'

const cardBaseStyle = `:uno:
relative bg-white rd-2 flex flex-col gap-2 duration-150
b-1 b-white shadow-md max-w-full md:max-w-180 w-[calc(100vw-.5rem)] p-2
h-full max-h-max
`

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
