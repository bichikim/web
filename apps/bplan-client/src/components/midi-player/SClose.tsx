import {cva, cx} from 'class-variance-authority'
import {ComponentProps} from 'solid-js'
import {HButton} from '@winter-love/solid-components'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'

export interface SCloseProps extends ComponentProps<'button'> {
  isHidden?: boolean
  isPlaying?: boolean
  onClose?: () => void
}

const rootStyle = cva(
  'flex items-center justify-center bg-red cursor-pointer b-0 absolute p-0',
  {
    compoundVariants: [
      {
        class: 'animate-pulse-alt',
        isHidden: true,
        isPlaying: true,
      },
    ],
    variants: {
      isHidden: {
        false:
          'w-9 h-9 left-1 md:left--7 top--8 md:top-unset md:bottom-0 md:rd-tr-0 md:rd-l-1 rd-t-1',
        true: 'w-9 h-9 top--10 left--10 z-1 rd-1',
      },
      isPlaying: {
        false: '',
        true: '',
      },
    },
  },
)

const iconStyle = cva('inline-block  text-7 text-white', {
  variants: {
    isHidden: {
      false: 'i-tabler:x',
      true: 'i-tabler:playlist',
    },
  },
})

export const SClose = (props: SCloseProps) => {
  const handleClose = () => {
    props.onClose?.()
  }

  return (
    <HButton
      {...preventGlobalTouchAttrs()}
      class={cx(
        rootStyle({
          isHidden: Boolean(props.isHidden),
          isPlaying: Boolean(props.isPlaying),
        }),
        props.class,
      )}
      type="button"
      onClick={handleClose}
      title={props.isHidden ? 'open midi player' : 'close midi player'}
    >
      <span class={iconStyle({isHidden: Boolean(props.isHidden)})} />
    </HButton>
  )
}
