import {cva} from 'class-variance-authority'
import {
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  Show,
  splitProps,
  ValidComponent,
} from 'solid-js'
// import {Dynamic} from 'solid-js/web'
import {SClose} from 'src/components/midi-player/SClose'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'
import {SettingData, SSetting} from './SSetting'

export interface SHiddenPlayerProps
  extends Omit<SPlayerProps, 'onPlaying'>,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay'> {
  component?: ValidComponent
  onSettingDataChange?: (data: SettingData) => void
  pianoMinScale?: number
  settingData?: SettingData
}

export type SurfaceKind = 'player' | 'setting'

const rootStyle = cva(
  'relative duration-150 bg-white rd-2 flex flex-col duration-150 gap-2',
  {
    variants: {
      isSetting: {
        false: '',
        true: 'h-0',
      },
      isShow: {
        false: 'w-0 h-0',
        true: 'min-w-88 max-w-124 p-2 mx-1 mb-1',
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
  const [innerProps, restProps] = splitProps(defaultProps, [
    'component',
    'settingData',
    'onSettingDataChange',
    'pianoMinScale',
  ])
  const [isShow, setIsShow] = createSignal(false)
  const [surfaceKind, setSurfaceKind] = createSignal<SurfaceKind>('player')
  const [isRender, setIsRender] = createSignal(false)
  const handleClose = () => {
    const _isShow = !isShow()

    if (_isShow) {
      setIsRender(true)
    } else {
      handleSurfaceKindChange('player')
    }

    setIsShow(_isShow)
  }
  const isPlaying = createMemo(
    () =>
      defaultProps.pianoState.playingId !== '' &&
      defaultProps.pianoState.leftTime < defaultProps.pianoState.totalDuration &&
      !defaultProps.pianoState.suspended,
  )
  const handleSurfaceKindChange = (kind: SurfaceKind) => {
    setSurfaceKind(kind)
  }

  const handleTransitionEnd = () => {
    setIsRender(isShow())
  }

  // Dynamic error with ssr prefetching hydration
  return (
    <aside class={props.class ?? 'relative'}>
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
        class={rootStyle({isSetting: surfaceKind() === 'setting', isShow: isShow()})}
        onTransitionEnd={handleTransitionEnd}
      >
        <SPlayer
          {...restProps}
          isHidden={!isRender()}
          onSetting={() => handleSurfaceKindChange('setting')}
        />
        <Show when={surfaceKind() === 'setting'}>
          <SSetting
            pianoMinScale={innerProps.pianoMinScale}
            settingData={innerProps.settingData}
            class="absolute bottom-0 left-0 w-full bg-white"
            onClose={() => handleSurfaceKindChange('player')}
            onSettingDataChange={innerProps.onSettingDataChange}
          />
        </Show>
      </section>
    </aside>
  )
}
