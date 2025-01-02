import {JSX, splitProps} from 'solid-js'
import {cva, cx} from 'class-variance-authority'

export interface SProgressProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  progress?: number
  selected?: boolean
}

const rootStyle = cva('block overflow-hidden rd-1', {
  variants: {
    selected: {
      false: 'bg-gray-100',
      true: '',
    },
  },
})
const barStyle = cva('block h-full', {
  variants: {
    selected: {
      false: 'bg-blue-300',
      true: 'bg-blue-200',
    },
  },
})

export const SProgress = (props: SProgressProps) => {
  const [innerProps, restProps] = splitProps(props, ['progress', 'selected'])

  return (
    <span
      {...restProps}
      class={cx(rootStyle({selected: innerProps.selected}), props.class)}
    >
      <span
        class={barStyle({selected: innerProps.selected})}
        style={{width: `${innerProps.progress ?? 0}%`}}
      />
    </span>
  )
}
