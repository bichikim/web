import {JSX, useContext} from 'solid-js'
import {cva, cx} from 'class-variance-authority'
import {KeyDownContext} from 'src/components/real-button/HRealButton'

export interface HKeyEffectProps extends JSX.HTMLAttributes<HTMLSpanElement> {}

const rootStyle = cva('block blur-sm opacity-80', {
  variants: {
    isDown: {
      true: 'bg-gradient-to-b',
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
