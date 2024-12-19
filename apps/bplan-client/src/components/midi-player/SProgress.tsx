import {JSX, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface SProgressProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  progress?: number
}

export const SProgress = (props: SProgressProps) => {
  const [innerProps, restProps] = splitProps(props, ['progress'])
  return (
    <span {...restProps} class={cx('block overflow-hidden rd-6px', props.class)}>
      <span
        class="block bg-blue-100 h-full"
        style={{width: `${innerProps.progress ?? 0}%`}}
      />
    </span>
  )
}
