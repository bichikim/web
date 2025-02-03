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
import {Dynamic} from 'solid-js/web'
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
        true: '',
      },
      isShow: {
        false: 'w-0 h-0',
        true: 'min-w-88 max-w-200 p-2 mx-1 mb-1',
      },
    },
  },
)

const playerContainerStyle = cva('flex flex-col gap-2 overflow-hidden', {
  variants: {
    isShow: {
      false: 'h-0 opacity-0 pointer-events-none',
      true: 'opacity-100',
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

  const [innerProps, restProps] = splitProps(defaultProps, [
    'component',
    'settingData',
    'onSettingDataChange',
    'pianoMinScale',
  ])
  const [isShow, setIsShow] = createSignal(false)
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
      defaultProps.pianoState.playingId !== '' &&
      defaultProps.pianoState.leftTime < defaultProps.pianoState.totalDuration &&
      !defaultProps.pianoState.suspended,
  )

  const handleSurfaceKindChange = (kind: SurfaceKind) => {
    setSurfaceKind(kind)
  }

  // Dynamic component has an error with ssr prefetching hydration
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
        class={rootStyle({isSetting: surfaceKind() === 'setting', isShow: isShow()})}
      >
        <div
          class={playerContainerStyle({
            isShow: surfaceKind() !== 'setting',
          })}
        >
          <SPlayer {...restProps} onSetting={() => handleSurfaceKindChange('setting')} />
        </div>
        <Show when={surfaceKind() === 'setting'}>
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
