import {cva, cx} from 'class-variance-authority'
import {createSignal, JSX} from 'solid-js'
import {SClose} from 'src/components/midi-player/SClose'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'

export interface SHiddenPlayerProps
  extends Omit<SPlayerProps, 'onPlaying'>,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay'> {}

const rootStyle = cva('relative duration-150 bg-white rd-2 flex flex-col duration-150', {
  variants: {
    isShow: {
      false: 'w-0px h-0px',
      true: 'min-w-350px max-w-500px p-2 mr-1 mb-1',
    },
  },
})

export const SHiddenPlayer = (props: SHiddenPlayerProps) => {
  const [isShow, setIsShow] = createSignal(false)
  const [isPlaying, setIsPlaying] = createSignal(false)

  const handleClose = () => {
    setIsShow((prev) => !prev)
  }

  const handlePlaying = (value: boolean) => {
    setIsPlaying(value)
  }

  return (
    <div class="relative">
      <SClose
        class=""
        onClose={handleClose}
        isHidden={!isShow()}
        isPlaying={isPlaying()}
      />
      <div
        {...preventGlobalTouchAttrs()}
        class={cx(rootStyle({isShow: isShow()}), props.class)}
      >
        <SPlayer {...props} onPlaying={handlePlaying} />
      </div>
    </div>
  )
}
