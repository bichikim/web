import {cva} from 'class-variance-authority'
import {ComponentProps, createMemo, useContext} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {HUNDRED} from '@winter-love/utils'
import {SButton} from 'src/components/button'
import {SHiddenPanelContext} from './SHiddenPanelProvider'

export interface SCloseProps extends ComponentProps<'button'> {
  isPlaying?: boolean
  playedTime?: number
  totalTime?: number
}

const rootStyle = cva(['absolute rd-1'], {
  defaultVariants: {
    isHidden: false,
    isPlaying: false,
  },
  variants: {
    isHidden: {
      false: 'left-1 md:left--8 top--8 md:top-unset md:bottom-1 before:opacity-0',
      true: 'bottom-1 left--10 z-1 before:opacity-50',
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
  const {isOpen, setIsOpen} = useContext(SHiddenPanelContext)

  const handleToggle = () => {
    setIsOpen(!isOpen())
  }

  const percent = createMemo(() => {
    if (!isOpen()) {
      return 0
    }

    if (!props.playedTime || !props.totalTime) {
      return 0
    }

    return (props.playedTime / props.totalTime) * HUNDRED
  })

  return (
    <SButton
      {...preventGlobalTouchAttrs()}
      variant="danger"
      flat
      fit
      loading={percent()}
      type="button"
      onClick={handleToggle}
      preventLoadingDisabled
      title={isOpen() ? 'open midi player' : 'close midi player'}
      class={rootStyle({class: props.class, isHidden: !isOpen()})}
    >
      <span class={iconStyle({isHidden: !isOpen()})} />
    </SButton>
  )
}
