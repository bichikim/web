import {cva, cx} from 'class-variance-authority'
import {createSignal, JSX} from 'solid-js'
import {SClose} from 'src/components/midi-player/SClose'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'

export interface SHiddenPlayerProps
  extends SPlayerProps,
    JSX.HTMLAttributes<HTMLElement> {}

export const SHiddenPlayer = (props: SHiddenPlayerProps) => {
  const [isShow, setIsShow] = createSignal(false)

  const handleClose = () => {
    setIsShow((prev) => !prev)
  }

  const rootStyle = cva(
    'relative duration-150 bg-white rd-2 flex flex-col duration-150',
    {
      variants: {
        isShow: {
          false: 'w-20px h-20px',
          true: 'min-w-350px max-w-500px p-2 mr-1 mb-1',
        },
      },
    },
  )

  return (
    <div class="relative">
      <div
        {...preventGlobalTouchAttrs()}
        class={cx(rootStyle({isShow: isShow()}), props.class)}
      >
        <SPlayer {...props} />
      </div>
      <SClose
        class="absolute top--20px left--20px hover:z-1"
        onClose={handleClose}
        isHidden={!isShow()}
      />
    </div>
  )
}
