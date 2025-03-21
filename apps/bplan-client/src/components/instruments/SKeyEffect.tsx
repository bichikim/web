import {JSX, useContext} from 'solid-js'
import {cva, cx} from 'class-variance-authority'
import {KeyDownContext} from 'src/components/real-button/HRealButton'

export interface HKeyEffectProps extends JSX.HTMLAttributes<HTMLSpanElement> {}

const rootStyle = cva('block blur-sm', {
  variants: {
    isDown: {
      false: 'opacity-0',
      true: 'bg-gradient-to-b opacity-80',
    },
  },
})

export const SKeyEffect = (props: HKeyEffectProps) => {
  const downContext = useContext(KeyDownContext)

  return (
    <span class={cx(rootStyle({isDown: Boolean(downContext().down)}), props.class)}>
      {props.children}
    </span>
  )
}
