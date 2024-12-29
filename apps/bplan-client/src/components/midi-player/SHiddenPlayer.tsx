import {cva} from 'class-variance-authority'
import {
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  splitProps,
  ValidComponent,
} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {SClose} from 'src/components/midi-player/SClose'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'

export interface SHiddenPlayerProps
  extends Omit<SPlayerProps, 'onPlaying'>,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay'> {
  component?: ValidComponent
  musics?: MusicInfo[]
}

const rootStyle = cva(
  'relative duration-150 bg-white rd-2 flex flex-col duration-150 gap-2',
  {
    variants: {
      isShow: {
        false: 'w-0px h-0px',
        true: 'min-w-350px max-w-500px p-2 mx-1 mb-1',
      },
    },
  },
)

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
  const [innerProps, restProps] = splitProps(defaultProps, ['component'])
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
    <Dynamic component={innerProps.component} class={props.class ?? 'relative'}>
      <SClose
        class="mb-1"
        onClose={handleClose}
        isHidden={!isShow()}
        isPlaying={isPlaying()}
        aria-expanded={isShow() ? 'true' : 'false'}
        aria-controls="__midi_player__"
      />
      <section
        title="midi player"
        id="__midi_player__"
        aria-hidden={isShow() ? 'false' : 'true'}
        {...preventGlobalTouchAttrs()}
        class={rootStyle({isShow: isShow()})}
      >
        <SPlayer {...restProps} />
      </section>
    </Dynamic>
  )
}
