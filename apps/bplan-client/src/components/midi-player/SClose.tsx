import {cva} from 'class-variance-authority'
import {ComponentProps, createMemo} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {HUNDRED} from '@winter-love/utils'
import {SButton} from 'src/components/button'

export interface SCloseProps extends ComponentProps<'button'> {
  isHidden?: boolean
  isPlaying?: boolean
  onClose?: () => void
  playedTime?: number
  totalTime?: number
}

const rootStyle = cva(['absolute'], {
  defaultVariants: {
    isHidden: false,
    isPlaying: false,
  },
  variants: {
    isHidden: {
      false:
        'left-1 md:left--7 top--8 md:top-unset md:bottom-1 md:rd-tr-0 md:rd-l-1 rd-t- before:opacity-0',
      true: 'top--10 left--10 z-1 rd-1 before:opacity-50',
    },
    isPlaying: {
      false: '',
      true: '',
    },
  },
})

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
    if (!props.isHidden) {
      return 0
    }

    if (!props.playedTime || !props.totalTime) {
      return 0
    }

    return (props.playedTime / props.totalTime) * HUNDRED
  })

  // class={cx(
  //   rootStyle({
  //     isHidden: Boolean(props.isHidden),
  //     isPlaying: Boolean(props.isPlaying),
  //   }),
  //   props.class,
  // )}

  return (
    <SButton
      {...preventGlobalTouchAttrs()}
      variant="danger"
      flat
      loading={percent()}
      type="button"
      onClick={handleClose}
      preventLoadingDisabled
      title={props.isHidden ? 'open midi player' : 'close midi player'}
      class={rootStyle({isHidden: props.isHidden})}
    >
      <span class={iconStyle({isHidden: Boolean(props.isHidden)})} />
    </SButton>
  )
}
