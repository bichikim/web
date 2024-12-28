import {cva, cx} from 'class-variance-authority'
import {createMemo, createSignal, JSX, mergeProps, ValidComponent} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {SClose} from 'src/components/midi-player/SClose'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'

export interface SHiddenPlayerProps
  extends Omit<SPlayerProps, 'onPlaying'>,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay'> {
  component?: ValidComponent
}

const rootStyle = cva('relative duration-150 bg-white rd-2 flex flex-col duration-150', {
  variants: {
    isShow: {
      false: 'w-0px h-0px',
      true: 'min-w-350px max-w-500px p-2 mx-1 mb-1',
    },
  },
})

export const SHiddenPlayer = (props: SHiddenPlayerProps) => {
  const defaultProps = mergeProps(
    {
      component: 'div',
      pianoState: {
        leftTime: 0,
        loaded: false,
        playingId: '',
        startedAt: 0,
        suspended: false,
        totalDuration: 0,
      },
    },
    props,
  )
  const [isShow, setIsShow] = createSignal(false)

  const handleClose = () => {
    setIsShow((prev) => !prev)
  }

  const isPlaying = createMemo(
    () =>
      defaultProps.pianoState.playingId !== '' &&
      defaultProps.pianoState.leftTime < defaultProps.pianoState.totalDuration &&
      !defaultProps.pianoState.suspended,
  )

  return (
    <Dynamic component={defaultProps.component} class={props.class ?? 'relative'}>
      <SClose
        class="mb-1"
        onClose={handleClose}
        isHidden={!isShow()}
        isPlaying={isPlaying()}
      />
      <div {...preventGlobalTouchAttrs()} class={rootStyle({isShow: isShow()})}>
        <SPlayer {...props} />
      </div>
    </Dynamic>
  )
}
