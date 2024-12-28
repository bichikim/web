import {cva, cx} from 'class-variance-authority'
import {JSX} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'

export interface SCloseProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  isHidden?: boolean
  isPlaying?: boolean
  onClose?: () => void
}

const rootStyle = cva(
  'flex items-center justify-center bg-red cursor-pointer b-0 absolute',
  {
    compoundVariants: [
      {
        class: 'animate-pulse-alt',
        isPlaying: true,
      },
    ],
    variants: {
      isHidden: {
        false:
          'w-36px h-36px left--32px sm:left-1 sm-top--32px bottom-0 rd-l-6px sm:rd-t-6px sm:rd-b-0px',
        true: 'w-36px h-36px top--40px left--40px z-1 rd-6px',
      },
      isPlaying: {
        false: '',
        true: '',
      },
    },
  },
)

const iconStyle = cva('inline-block  text-28px text-white', {
  variants: {
    isHidden: {
      false: 'i-hugeicons:cancel-02',
      true: 'i-hugeicons:youtube',
    },
  },
})

export const SClose = (props: SCloseProps) => {
  const handleClose = () => {
    props.onClose?.()
  }

  return (
    <button
      class={cx(
        rootStyle({
          isHidden: Boolean(props.isHidden),
          isPlaying: Boolean(props.isPlaying),
        }),
        props.class,
      )}
      onClick={handleClose}
      onTouchEnd={handleClose}
      aria-label="Close midi player"
      {...preventGlobalTouchAttrs()}
    >
      <span class={iconStyle({isHidden: Boolean(props.isHidden)})} />
    </button>
  )
}
