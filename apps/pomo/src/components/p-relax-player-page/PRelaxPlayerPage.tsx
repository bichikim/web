import {createSignal, Show} from 'solid-js'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'

import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../p-button/PButton'

import {PMusicPlayer} from '../p-music-player/PMusicPlayer'
import {SoundEffects} from '../music-player-view/SoundEffects'
import type {VirtualLightPosition} from 'src/features/relax-glass-renderer'
import {DEFAULT_RELAX_BACKGROUND_SOURCE, RELAX_BACKGROUND_OPTIONS} from './background-options'
import {DEFAULT_DAYLIGHT_POSITION} from './light-positions'
import {RelaxBackgroundPicker} from './RelaxBackgroundPicker'
import {RelaxGlassBackground} from './RelaxGlassBackground'
import type {RelaxWeather} from './types'
import {useDaylightTilt} from './use-daylight-tilt'
import {useRelaxDepthMotion} from './use-relax-depth-motion'

export interface PRelaxPlayerPageProps {
  readonly backgroundSrc?: string
  readonly daylightPosition?: VirtualLightPosition
  readonly interiorPosition?: VirtualLightPosition
  readonly returnHref?: string
}

export const PRelaxPlayerPage = (props: PRelaxPlayerPageProps) => {
  const [expanded, setExpanded] = createSignal(true)
  const [selectedBackground, setSelectedBackground] = createSignal<string | null>(null)
  const [weather, setWeather] = createSignal<RelaxWeather>('sunny')
  const [mistIntensity, setMistIntensity] = createSignal(1)
  const [selectedDaylightPosition, setSelectedDaylightPosition] =
    createSignal<VirtualLightPosition | null>(null)
  const backgroundSource = () =>
    selectedBackground() ?? props.backgroundSrc ?? DEFAULT_RELAX_BACKGROUND_SOURCE
  const daylightPosition = () =>
    selectedDaylightPosition() ?? props.daylightPosition ?? DEFAULT_DAYLIGHT_POSITION
  const depthMotion = useRelaxDepthMotion()
  const daylightTilt = useDaylightTilt(daylightPosition, depthMotion.offset)
  const depthSource = () => {
    const source = backgroundSource()
    return RELAX_BACKGROUND_OPTIONS.find((option) => option.source === source)?.depthSource
  }
  const selectBackground = (source: string) => {
    depthMotion.cancelDrag()
    setSelectedBackground(source)
  }

  return (
    <main
      class={cx(
        'relative flex min-h-dvh w-full items-end justify-center overflow-hidden px-4 pb-4 xs:pb-6',
        'bg-background text-foreground',
      )}
    >
      <Show keyed when={backgroundSource()}>
        {(source) => (
          <RelaxGlassBackground
            backgroundSrc={source}
            daylightPosition={daylightTilt.position()}
            depthInput={depthMotion.inputMode()}
            depthOffset={depthMotion.offset()}
            depthSrc={depthSource()}
            interiorPosition={props.interiorPosition}
            mistIntensity={mistIntensity()}
            onPointerDown={depthMotion.onPointerDown}
            onPointerMove={depthMotion.onPointerMove}
            onPointerUp={depthMotion.onPointerUp}
            weather={weather()}
          />
        )}
      </Show>
      <div class="absolute right-4 top-safe-top-mobile flex items-center gap-2 xs:right-7 lg:top-safe-top">
        <RelaxBackgroundPicker
          daylightPosition={daylightPosition()}
          depthInput={depthMotion.inputMode()}
          depthStatus={depthMotion.status()}
          onDaylightPositionChange={setSelectedDaylightPosition}
          onDepthInputChange={depthMotion.setInputMode}
          onSelect={selectBackground}
          onMistIntensityChange={setMistIntensity}
          onWeatherChange={setWeather}
          mistIntensity={mistIntensity()}
          selectedSource={backgroundSource()}
          weather={weather()}
        />
        <SoundEffects trigger="toolbar" />
        <Show when={props.returnHref}>
          {(href) => (
            <PButton
              {...GLASS_ICON_BUTTON}
              accessibleLabel={m.relax_return_to_app()}
              href={href()}
              icon="i-tabler-apps"
              pill
              tooltip={m.relax_return_to_app()}
            />
          )}
        </Show>
      </div>
      <div
        class={cx(
          'relative w-full max-w-[29rem] [&_.pomo-player-stage]:relative',
          '[&_.pomo-player-stage]:inset-auto [&_.pomo-player-stage]:w-full',
          expanded() &&
            cx(
              'h-[22.75rem] max-h-[calc(100dvh-2rem)] xs:h-[19.875rem] xs:max-h-[calc(100dvh-3rem)]',
              '[&_.pomo-player-stage]:h-full [&_.pomo-player-stage]:[container-type:size]',
            ),
        )}
      >
        <PMusicPlayer
          expanded={expanded()}
          onExpandedChange={setExpanded}
          soundEffectsVisible={false}
        />
      </div>
    </main>
  )
}
