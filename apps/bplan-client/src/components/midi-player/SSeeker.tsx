import {createMemo, createSignal, JSX, mergeProps, splitProps} from 'solid-js'
import {HUNDRED} from '@winter-love/utils'

/**
 * SSeeker Props
 * extend HTML DIV Element attributes
 */
export interface SSeekerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  leftTime?: number
  onSeek?: (time: number) => void
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
  const progress = createMemo(() => {
    if (innerProps.totalDuration === 0) {
      return 0
    }

    return innerProps.leftTime / innerProps.totalDuration
  })
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const handleSeek = (x: number) => {
    const target = element()

    if (!target) {
      return
    }

    const {left, width} = target.getBoundingClientRect()
    const progress = (x - left) / width
    const leftTime = progress * innerProps.totalDuration

    props.onSeek?.(leftTime)
  }

  const handleTouchStart = (event: TouchEvent) => {
    const {
      touches: [touch],
    } = event

    if (touch) {
      const {pageX} = touch

      handleSeek(pageX)
    }
  }

  const handleClick = (event: MouseEvent) => {
    const {pageX} = event

    handleSeek(pageX)
  }

  return (
    <button
      {...restProps}
      class={props.class ?? 'relative'}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      ref={setElement}
      title="seek"
    >
      <div class="absolute top-0 left-0 w-full h-full bg-gray-100" />
      <div
        class="absolute top-0 left-0 h-full bg-blue"
        style={{width: `${progress() * HUNDRED}%`}}
      />
    </button>
  )
}
