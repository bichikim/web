import {cva, cx} from 'class-variance-authority'
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
import {SClose} from 'src/components/midi-player/SClose'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {SPlayer, SPlayerProps} from './SPlayer'
import {SettingData, SSetting} from './SSetting'
import {ResizeCard} from 'src/components/resize-card'
import {useWindowSize} from './window-size'

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

const rootBaseStyle = `:uno:
relative duration-500 bg-white rd-2 flex flex-col duration-150 gap-2 bg-opacity-90
backdrop-blur-sm b-1 b-white shadow-md max-w-full md:max-w-180 w-[calc(100vw-.5rem)] p-2
h-full max-h-max
`

const handleUpStyle = `:uno:
cursor-ns-resize h-2 absolute top-0 md:right-50% right-[calc(50%-2.5rem)]
translate-x-1/2 translate-y--1/2 md:w-full w-[calc(100vw-2.5rem)]
`

const handleUpKeyStyle = `:uno:
absolute top-0 left-50% translate-x--1/2 translate-y--70% rd-1 w-6 h-3 bg-gray-100 pointer-events-none
`

const rootStyle = cva(rootBaseStyle, {
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
})

const playerContainerStyle = cva(':uno: flex flex-col gap-2 overflow-hidden', {
  variants: {
    isSetting: {
      false: '',
      true: ':uno: w-0 h-auto hidden pointer-events-none',
    },
    isShow: {
      false: ':uno: hidden opacity-0 pointer-events-none',
      true: ':uno: opacity-100',
    },
  },
})

export const SHiddenPlayer = (props: SHiddenPlayerProps) => {
  const maxPercent = 0.8

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
  const windowSize = useWindowSize({height: 500, width: 800})

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

  const containerStyle = createMemo(() => {
    const className = 'h-56 min-h-56 max-h-max flex flex-col justify-end'

    return props.class ? cx(props.class, className) : cx('relative', className)
  })

  const maxHeight = createMemo(() => {
    return windowSize().height * maxPercent
  })

  return (
    <ResizeCard.Provider preventWidthResize maxSize={{height: maxHeight()}}>
      <ResizeCard.Body component={innerProps.component} class={containerStyle()}>
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
          <Show when={isShow()}>
            <div class={handleUpKeyStyle}>
              <span class="i-hugeicons:equal-sign c-gray-400 w-full h-full block"></span>
            </div>
            <ResizeCard.Handle resizeType="up" class={handleUpStyle}></ResizeCard.Handle>
          </Show>
        </section>
      </ResizeCard.Body>
    </ResizeCard.Provider>
  )
}
