import {cva, cx} from 'class-variance-authority'
import {createSignal} from 'solid-js'
import {SClose} from 'src/components/midi-player/SClose'
import {SPlayer, SPlayerProps} from './SPlayer'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'

export interface SHiddenPlayerProps extends SPlayerProps {}

export const SHiddenPlayer = (props: SHiddenPlayerProps) => {
  const [isShow, setIsShow] = createSignal(false)

  const handleClose = () => {
    setIsShow((prev) => !prev)
  }

  const rootStyle = cva(
    'relative duration-150 bg-white rd-2 flex flex-col relative duration-150',
    {
      variants: {
        isShow: {
          false: 'w-20px h-20px',
          true: 'min-w-350px max-w-500px p-2',
        },
      },
    },
  )

  return (
    <div
      {...preventGlobalTouchAttrs()}
      class={cx(rootStyle({isShow: isShow()}), props.class)}
    >
      <SPlayer {...props} class={rootStyle({isShow: isShow()})} />
      <SClose
        class="absolute top--20px left--20px"
        onClose={handleClose}
        isHidden={!isShow()}
      />
    </div>
  )
}
