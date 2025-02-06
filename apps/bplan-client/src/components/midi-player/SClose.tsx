import {cva, cx} from 'class-variance-authority'
import {ComponentProps, createMemo} from 'solid-js'
import {HButton} from '@winter-love/solid-components'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {HUNDRED} from '@winter-love/utils'

export interface SCloseProps extends ComponentProps<'button'> {
  isHidden?: boolean
  isPlaying?: boolean
  onClose?: () => void
  playedTime?: number
  totalTime?: number
}

const rootStyle = cva(
  'flex items-center justify-center bg-red cursor-pointer b-0 absolute p-0 shadow-md overflow-hidden ' +
    'before:content-[""] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent ' +
    'before:to-white before:w-var-close-percent',
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
          'w-9 h-9 left-1 md:left--7 top--8 md:top-unset md:bottom-0 md:rd-tr-0 md:rd-l-1 rd-t-1 before:opacity-0',
        true: 'w-9 h-9 top--10 left--10 z-1 rd-1 before:opacity-50',
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

  const percent = createMemo(() => {
    if (!props.playedTime || !props.totalTime) {
      return 0
    }

    return (props.playedTime / props.totalTime) * HUNDRED
  })

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
      style={{'--var-close-percent': `${percent()}%`}}
      type="button"
      onClick={handleClose}
      title={props.isHidden ? 'open midi player' : 'close midi player'}
    >
      <span class={iconStyle({isHidden: Boolean(props.isHidden)})} />
    </HButton>
  )
}
