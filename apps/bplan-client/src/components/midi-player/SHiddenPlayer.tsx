import {cva} from 'class-variance-authority'
import {
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  Show,
  splitProps,
  untrack,
  ValidComponent,
} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {SClose} from 'src/components/midi-player/SClose'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'
import {SettingData, SSetting} from './SSetting'

export interface SHiddenPlayerProps
  extends Omit<SPlayerProps, 'onPlaying' | 'onPlay' | 'isShow'>,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay'> {
  component?: ValidComponent
  initShow?: boolean
  onSettingDataChange?: (data: SettingData) => void
  pianoMinScale?: number
  settingData?: SettingData
}

export type SurfaceKind = 'player' | 'setting'

const rootStyle = cva(
  'relative duration-500 bg-white rd-2 flex flex-col duration-150 gap-2 bg-opacity-90 ' +
    'backdrop-blur-sm b-1 b-white shadow-md max-w-full md:max-w-180 w-[calc(100vw-.5rem)] p-2',
  {
    variants: {
      isSetting: {
        false: '',
        true: '',
      },
      isShow: {
        false: 'ml-1 mr--400',
        true: '',
      },
    },
  },
)

const playerContainerStyle = cva('flex flex-col gap-2 overflow-hidden', {
  variants: {
    isSetting: {
      false: '',
      true: 'w-0 h-0 hidden pointer-events-none',
    },
    isShow: {
      false: 'hidden opacity-0 pointer-events-none',
      true: 'opacity-100',
    },
  },
})

export const SHiddenPlayer = (props: SHiddenPlayerProps) => {
  const defaultProps = mergeProps(
    {
      component: 'div',
      playState: {
        leftTime: 0,
        loaded: false,
        playedTime: 0,
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
  const initShow = untrack(() => props.initShow ?? false)
  const [isShow, setIsShow] = createSignal(initShow)
  const [surfaceKind, setSurfaceKind] = createSignal<SurfaceKind>('player')

  const handleClose = () => {
    setIsShow((prev) => {
      const nextState = !prev

      if (nextState) {
        handleSurfaceKindChange('player')
      }

      return nextState
    })
  }

  const isPlaying = createMemo(
    () =>
      defaultProps.playState.playingId !== '' &&
      defaultProps.playState.leftTime < defaultProps.playState.totalDuration &&
      !defaultProps.playState.suspended,
  )

  const handleSurfaceKindChange = (kind: SurfaceKind) => {
    setSurfaceKind(kind)
  }

  return (
    <Dynamic component={innerProps.component} class={props.class ?? 'relative'}>
      <SClose
        class="mb-1"
        onClose={handleClose}
        isHidden={!isShow()}
        isPlaying={isPlaying()}
        aria-expanded={isShow() ? 'true' : 'false'}
        aria-controls="__midi_player__"
        playedTime={defaultProps.playState.playedTime}
        totalTime={defaultProps.playState.totalDuration}
      />
      <section
        aria-label="midi player"
        id="__midi_player__"
        aria-hidden={isShow() ? 'false' : 'true'}
        {...preventGlobalTouchAttrs()}
        class={rootStyle({isSetting: surfaceKind() === 'setting', isShow: isShow()})}
      >
        <div
          class={playerContainerStyle({
            isSetting: surfaceKind() === 'setting',
            isShow: isShow(),
          })}
        >
          <SPlayer
            {...restProps}
            isShow={isShow()}
            onSetting={() => handleSurfaceKindChange('setting')}
          />
        </div>
        <Show when={surfaceKind() === 'setting' && isShow()}>
          <SSetting
            pianoMinScale={innerProps.pianoMinScale}
            settingData={innerProps.settingData}
            class="w-full bg-white"
            onClose={() => handleSurfaceKindChange('player')}
            onSettingDataChange={innerProps.onSettingDataChange}
          />
        </Show>
      </section>
    </Dynamic>
  )
}
