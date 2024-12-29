import {createMemo, JSX, mergeProps, splitProps} from 'solid-js'
import {HUNDRED} from '@winter-love/utils'

/**
 * SSeeker Props
 * extend HTML DIV Element attributes
 */
export interface SSeekerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  leftTime?: number
  totalDuration?: number
}

/**
 * solid js component
 * @param props
 * @constructor
 */
export const SSeeker = (props: SSeekerProps) => {
  const defaultProps = mergeProps({leftTime: 0, totalDuration: 0}, props)
  const [innerProps, restProps] = splitProps(defaultProps, ['leftTime', 'totalDuration'])

  const progress = createMemo(() => innerProps.leftTime / innerProps.totalDuration)
  return (
    <div {...restProps} class={props.class ?? 'relative'}>
      <div class="absolute top-0 left-0 w-full h-full bg-gray-200" />
      <div
        class="absolute top-0 left-0 h-full bg-blue"
        style={{width: `${progress() * HUNDRED}%`}}
      />
    </div>
  )
}
