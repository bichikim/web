import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, type JSX, onCleanup, onMount, Show} from 'solid-js'

import smilingFaceSource from './assets/pomodoro-status-icons/break.webp'
import {getPomoIconClass} from '../design-system/icon-style'
import {PButton} from '../design-system/PButton'
import {PIconButton} from '../design-system/PIconButton'
import {PSelect} from '../design-system/PSelect'
import type {PTrack} from '../features/focus-room-audio'
import {RANDOM_DIALOGUE_EVENT, usePEvents, useRandomEvent} from '../features/focus-room-dialogue'
import {readFocusRoomEntrySession, writeFocusRoomEntrySession} from '../features/focus-room-entry'
import {
  getPScene,
  type PSceneId,
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../features/focus-room-animation'
import {
  getAutomaticScenePeriod,
  getNextTimeMode,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../features/focus-room-time'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type PActivity,
  type PGaze,
  usePScenePreferences,
} from '../features/focus-room-scene-preferences'
import {type PSayController, usePSay} from '../features/pomo-webmcp'
import {type ScreenSaverDelay, useScreenSaver} from '../features/screen-saver'
import {PServicePolicyLinks} from '../features/service-terms'
import {useWeather, type WeatherCitySlug, type WeatherState} from '../features/weather'
import {PMusicPlayer} from './PMusicPlayer'
import {PFeedStatus} from './PFeedStatus'
import {PDialoguePlayer} from './PDialoguePlayer'
import {PPomodoro, type PPomodoroPresentation} from './PPomodoro'
import {resolvePSceneViseme} from './pomo-scene-options'
import {PScreenSaver} from './PScreenSaver'
import {PScribbleCircleControl} from './PScribbleCircleControl'
import {PWeatherStatus} from './PWeatherStatus'
import {useDialogueSceneGaze} from './use-dialogue-scene-gaze'

const CLASSES = {
  entry: [
    'pomo-entry absolute inset-0 flex items-end',
    'text-[#fff9f1]',
    '[&[data-exiting]]:animate-entry-reveal-room',
    '[&[data-exiting]]:pointer-events-none',
    'motion-reduce:[&[data-exiting]]:[animation-duration:1ms]',
  ].join(' '),
  entryAction: [
    'pomo-entry__action [button&]:min-w-[min(17rem,_100%)] [button&]:min-h-14',
    '[button&]:[padding-inline:1.5rem] [button&]:text-[0.9375rem]',
  ].join(' '),
  entryContent: [
    'pomo-entry__content flex w-[min(calc(100%_-_2rem_-_var(--pomo-safe-area-inset-left)),_22rem)]',
    'box-border flex-col items-start gap-4',
    '[margin-block-end:calc(9rem_+_var(--pomo-safe-area-inset-bottom))]',
    '[margin-inline-start:calc(1rem_+_var(--pomo-safe-area-inset-left))]',
    'lg:[margin-block-end:calc(2.5rem_+_var(--pomo-safe-area-inset-bottom))]',
    'lg:[margin-inline-start:calc(2.5rem_+_var(--pomo-safe-area-inset-left))]',
  ].join(' '),
  entryLeadingImage: [
    'size-16 [margin-block:-1.25rem] [margin-inline-start:-0.75rem]',
    '[filter:drop-shadow(0_0.125rem_0.1875rem_rgb(0_0_0_/_32%))]',
  ].join(' '),
  loading: [
    'pomo-loading flex h-control-sm box-border items-center gap-2',
    'rounded-control bg-surface py-0 px-3',
    'text-foreground text-xs font-[650] leading-4 shadow-panel',
  ].join(' '),
  loadingSpinner: [
    'pomo-loading__spinner w-4 h-4 box-border flex-none',
    'animate-spin [border:2px_solid_rgb(255_255_255_/_28%)]',
    'border-t-highlight rounded-control',
    'motion-reduce:animate-[none]',
  ].join(' '),
  mediaDock: [
    'pomo-media-dock [--pomo-player-compact-width:7.75rem] absolute min-h-0',
    'top-[calc(5.25rem_+_var(--pomo-safe-area-inset-top))]',
    'right-safe-right-mobile bottom-safe-bottom-mobile left-safe-left-mobile flex',
    'flex-col items-start justify-end pointer-events-none gap-3',
    '[&_.pomo-player-stage]:relative [&_.pomo-player-stage]:inset-[auto]',
    '[&_.pomo-player-stage]:w-[min(29rem,_100%)] [&_.pomo-player-stage]:min-h-0',
    '[&_.pomo-player-stage]:max-h-full [&_.pomo-player-stage]:[flex:0_1_auto]',
    '[&_.pomo-player-stage]:pointer-events-auto',
    '[&_.pomo-player-stage]:transition-[width_180ms_ease] [&_.pomo-dialogue-bubble]:w-full',
    '[&_.pomo-dialogue-bubble]:max-h-full [&_.pomo-dialogue-bubble]:[flex:0_1_auto]',
    '[&_.pomo-dialogue-bubble]:pointer-events-auto',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player-stage]:w-[var(--pomo-player-compact-width)]',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player__summary]:justify-center',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player__play-summary-frame]:hidden',
    '[&[data-dialogue-active]:not([data-player-expanded])_[data-pomo-player-title]]:hidden',
    '[&[data-dialogue-active]:not([data-player-expanded])_[data-player-utility=album]]:hidden',
    '[&[data-player-expanded]_.pomo-player-stage]:[flex:1_1_0%]',
    '[&[data-player-expanded]_.pomo-player-stage]:[container-type:size]',
    '[&[data-player-expanded]_.pomo-player-stage]:max-h-[19.875rem]',
    'max-xs:[&[data-player-expanded]_.pomo-player-stage]:max-h-[22.75rem]',
    'lg:top-[calc(5.75rem_+_var(--pomo-safe-area-inset-top))]',
    'lg:right-safe-right lg:bottom-safe-bottom lg:left-safe-left',
    'motion-reduce:[&_.pomo-player-stage]:transition-[none]',
  ].join(' '),
  mediaMessages: [
    'pomo-media-messages flex w-[min(36rem,_100%)] min-h-0 max-h-full [flex:0_1_auto] flex-col',
    'gap-3 overflow-hidden pointer-events-none [&_>_*]:pointer-events-auto',
  ].join(' '),
  sceneControl: [
    'pomo-scene-control max-lg:[&.pomo-icon-button]:hidden',
    'max-lg:[&.pomo-icon-select]:hidden',
  ].join(' '),
  ui: 'pomo-ui pointer-events-none absolute inset-0',
} as const

const ENTRY_STYLE: JSX.CSSProperties = {
  background: [
    'radial-gradient(ellipse 125% 105% at 0% 108%, ',
    'rgb(7 5 4 / 94%) 0%, rgb(7 5 4 / 82%) 28%, ',
    'rgb(7 5 4 / 58%) 54%, rgb(7 5 4 / 30%) 74%, transparent 92%)',
  ].join(''),
}

const PSceneCanvas = clientOnly(() => import('./PSceneCanvas'), {
  lazy: true,
})
const PSettings = clientOnly(() => import('./PSettings'), {lazy: true})
const AUTOMATIC_PERIOD_REFRESH = 60_000
const INITIAL_POMODORO_PRESENTATION = {
  phaseLabel: '집중',
  statusLabel: '집중 준비',
  timeLabel: '25:00',
} satisfies PPomodoroPresentation

type SceneTime = ScenePeriod

interface SceneAsset {
  readonly depthSource: string
  readonly id: PSceneId
  readonly label: string
  readonly source: string
}

interface SceneToolbarProps {
  readonly activity: PActivity
  readonly canUseGyroscope?: boolean
  readonly gaze: PGaze
  readonly isSceneTransitioning: boolean
  readonly onActivityChange: (activity: PActivity) => void
  readonly onGazeChange: (gaze: PGaze) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly onMotionModeChange: (motionMode: PSceneMotionMode) => void
  readonly onScreenSaverDelayChange: (delay: ScreenSaverDelay) => void
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly onTimeModeChange: (mode: SceneTimeMode) => void
  readonly onWeatherCityChange: (citySlug: WeatherCitySlug) => void
  readonly onWeatherEnabledChange: (enabled: boolean) => void
  readonly screenSaverDelay: ScreenSaverDelay
  readonly sceneStyle: PSceneStyle
  readonly motionInput?: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly time: SceneTime
  readonly timeMode: SceneTimeMode
  readonly weatherCitySlug: WeatherCitySlug
  readonly weatherEnabled: boolean
  readonly weatherState: WeatherState
}

interface PEntryProps {
  readonly isExiting: boolean
  readonly onEnter: () => void
  readonly onExitComplete: () => void
}

interface PStudioEventsProps {
  readonly isPlayerExpanded: boolean
  readonly onPlayerExpandedChange: (isExpanded: boolean) => void
  readonly onPomodoroPresentationChange: (presentation: PPomodoroPresentation) => void
  readonly onTrackChange: (track: PTrack | null) => void
  readonly pomoSay: PSayController
  readonly sceneStyle: PSceneStyle
}

const findLabel = <TValue extends string>(
  options: readonly {readonly label: string; readonly value: TValue}[],
  value: TValue,
) => options.find((option) => option.value === value)?.label ?? value

const getSceneAsset = (
  time: SceneTime,
  activity: PActivity,
  gaze: PGaze,
  sceneStyle: PSceneStyle,
): SceneAsset => {
  const timeLabel = findLabel(FOCUS_ROOM_TIME_OPTIONS, time)
  const activityLabel = findLabel(FOCUS_ROOM_ACTIVITY_OPTIONS, activity)
  const gazeLabel = findLabel(FOCUS_ROOM_GAZE_OPTIONS, gaze)
  const scene = getPScene(time, activity, gaze)

  return {
    depthSource: scene.depthSources[sceneStyle],
    id: scene.id,
    label: `${timeLabel} · ${activityLabel} · ${gazeLabel}`,
    source: scene.source,
  }
}

const SceneToolbar = (props: SceneToolbarProps) => {
  const timeModeOption = () =>
    FOCUS_ROOM_TIME_OPTIONS.find((option) => option.value === props.timeMode) ??
    FOCUS_ROOM_TIME_OPTIONS[0]
  const timeAccessibleLabel = () => {
    const option = timeModeOption()

    return option.value === 'auto'
      ? `시간대 자동, 현재 ${findLabel(FOCUS_ROOM_TIME_OPTIONS, props.time)}`
      : `시간대 ${option.label}`
  }

  return (
    <div
      class={cx(
        'pointer-events-auto absolute right-4 top-[calc(1rem+var(--pomo-safe-area-inset-top))]',
        'flex flex-col items-end gap-2',
        'xs:right-7 lg:top-6',
      )}
    >
      <div class="flex flex-wrap justify-end gap-2" role="group" aria-label="장면 설정">
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PIconButton
            accessibleLabel={timeAccessibleLabel()}
            class={CLASSES.sceneControl}
            feedback={timeModeOption().label}
            icon={getPomoIconClass(timeModeOption().icon, props.sceneStyle)}
            onPress={() => props.onTimeModeChange(getNextTimeMode(props.timeMode))}
          />
        </PScribbleCircleControl>
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PSelect
            appearance="icon"
            class={CLASSES.sceneControl}
            getIconClass={(icon) => getPomoIconClass(icon, props.sceneStyle)}
            hideLabel
            label="행동"
            onChange={props.onActivityChange}
            options={FOCUS_ROOM_ACTIVITY_OPTIONS}
            value={props.activity}
          />
        </PScribbleCircleControl>
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PSelect
            appearance="icon"
            class={CLASSES.sceneControl}
            getIconClass={(icon) => getPomoIconClass(icon, props.sceneStyle)}
            hideLabel
            label="보기"
            onChange={props.onGazeChange}
            options={FOCUS_ROOM_GAZE_OPTIONS}
            value={props.gaze}
          />
        </PScribbleCircleControl>
        <PSettings
          activity={props.activity}
          canUseGyroscope={props.canUseGyroscope}
          gaze={props.gaze}
          onActivityChange={props.onActivityChange}
          onGazeChange={props.onGazeChange}
          onMotionInputChange={props.onMotionInputChange}
          onMotionModeChange={props.onMotionModeChange}
          onScreenSaverDelayChange={props.onScreenSaverDelayChange}
          onSceneStyleChange={props.onSceneStyleChange}
          onTimeModeChange={props.onTimeModeChange}
          onWeatherCityChange={props.onWeatherCityChange}
          onWeatherEnabledChange={props.onWeatherEnabledChange}
          screenSaverDelay={props.screenSaverDelay}
          sceneStyle={props.sceneStyle}
          motionInput={props.motionInput}
          motionMode={props.motionMode}
          timeMode={props.timeMode}
          weatherCitySlug={props.weatherCitySlug}
          weatherEnabled={props.weatherEnabled}
          fallback={
            <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
              <span
                aria-hidden="true"
                class={cx(
                  'inline-flex h-control-md min-w-control-md items-center justify-center rounded-control',
                  'border border-solid border-border bg-surface text-foreground shadow-panel',
                )}
              >
                <span
                  class={cx(
                    getPomoIconClass('i-tabler-settings', props.sceneStyle),
                    'size-5 text-highlight',
                  )}
                />
              </span>
            </PScribbleCircleControl>
          }
        />
      </div>
      <PWeatherStatus sceneStyle={props.sceneStyle} state={props.weatherState} />
      <Show when={props.isSceneTransitioning}>
        <span
          aria-live="polite"
          class={cx('border border-solid border-border backdrop-blur-surface', CLASSES.loading)}
          role="status"
        >
          <span aria-hidden="true" class={CLASSES.loadingSpinner} />
          장면 전환 중
        </span>
      </Show>
    </div>
  )
}

const PEntry = (props: PEntryProps) => (
  <section
    aria-label="Pomo 시작"
    class={CLASSES.entry}
    data-exiting={props.isExiting ? '' : undefined}
    style={ENTRY_STYLE}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) {
        props.onExitComplete()
      }
    }}
  >
    <div class={CLASSES.entryContent}>
      <div class="grid gap-3">
        <PButton
          class={CLASSES.entryAction}
          disabled={props.isExiting}
          leadingImage={smilingFaceSource}
          leadingImageClass={CLASSES.entryLeadingImage}
          onPress={() => props.onEnter()}
          tone="primary"
          trailingIcon="i-tabler-arrow-right"
        >
          포모와 시작하기
        </PButton>
        <PServicePolicyLinks tone="overlay" />
      </div>
    </div>
  </section>
)

const PSceneFallback = () => (
  <div
    aria-live="polite"
    class="pomo-scene-fallback pointer-events-none absolute inset-0 grid place-items-center text-foreground"
    role="status"
  >
    <span class={cx('border border-solid border-border backdrop-blur-surface', CLASSES.loading)}>
      <span aria-hidden="true" class={CLASSES.loadingSpinner} />
      장면 준비 중…
    </span>
  </div>
)

const PStudioEvents = (props: PStudioEventsProps) => {
  const events = usePEvents()
  const handlePomodoroEvents = (eventIds: Parameters<typeof events.playDialogueEvents>[0]) =>
    events.playDialogueEvents(eventIds, props.pomoSay.stop).catch((error: unknown) => {
      console.error('Unexpected pomodoro dialogue playback failure.', error)
    })

  useRandomEvent({onEvent: () => handlePomodoroEvents([RANDOM_DIALOGUE_EVENT])})

  return (
    <>
      <PPomodoro
        onEvents={handlePomodoroEvents}
        onPresentationChange={props.onPomodoroPresentationChange}
        sceneStyle={props.sceneStyle}
      />
      <div
        class={CLASSES.mediaDock}
        data-dialogue-active={
          events.activeText() === null &&
          props.pomoSay.speechText() === null &&
          !events.isDialoguePlaybackBlocked() &&
          events.scheduledDialogueCount() === 0
            ? undefined
            : ''
        }
        data-player-expanded={props.isPlayerExpanded ? '' : undefined}
      >
        <PMusicPlayer
          expanded={props.isPlayerExpanded}
          onExpandedChange={props.onPlayerExpandedChange}
          onTrackChange={props.onTrackChange}
          sceneStyle={props.sceneStyle}
        />
        <div class={CLASSES.mediaMessages}>
          <PFeedStatus sceneStyle={props.sceneStyle} />
          <PDialoguePlayer
            externalText={props.pomoSay.speechText()}
            onStopExternalSpeech={props.pomoSay.stop}
            sceneStyle={props.sceneStyle}
          />
        </div>
      </div>
    </>
  )
}

export const PStudio = () => {
  const events = usePEvents()
  const pomoSay = usePSay({onBeforeSpeech: events.onStopDialoguePlayback})
  const [automaticPeriod, setAutomaticPeriod] = createSignal<ScenePeriod>('day')
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('drag')
  const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
  const [canUseGyroscope, setCanUseGyroscope] = createSignal(false)
  const [isSceneLoading, setIsSceneLoading] = createSignal(true)
  const [hasSceneRendered, setHasSceneRendered] = createSignal(false)
  const [isPlayerExpanded, setIsPlayerExpanded] = createSignal(false)
  const hasEntered = events.hasEnteredFocusRoom
  const [isEntryVisible, setIsEntryVisible] = createSignal(false)
  const [currentTrack, setCurrentTrack] = createSignal<PTrack | null>(null)
  const [pomodoroPresentation, setPomodoroPresentation] = createSignal<PPomodoroPresentation>(
    INITIAL_POMODORO_PRESENTATION,
  )
  const screenSaver = useScreenSaver()
  const weather = useWeather()
  const scenePreferences = usePScenePreferences()
  const sceneStyleController = usePSceneStyle()
  const time = createMemo(() => resolveScenePeriod(scenePreferences.timeMode(), automaticPeriod()))
  const sceneGaze = useDialogueSceneGaze(
    scenePreferences.gaze,
    events.isDialoguePlaying,
    pomoSay.isPlaying,
  )
  const {sceneStyle} = sceneStyleController
  const selectedScene = createMemo(() =>
    getSceneAsset(time(), scenePreferences.activity(), sceneGaze(), sceneStyle()),
  )
  const activeViseme = createMemo(() =>
    resolvePSceneViseme(
      events.activeViseme(),
      events.isDialoguePlaying(),
      pomoSay.speechText(),
      pomoSay.activeViseme(),
    ),
  )
  const handleLoadingChange = (isLoading: boolean) => {
    setIsSceneLoading(isLoading)
    setHasSceneRendered((hasRendered) => hasRendered || !isLoading)
  }
  const handleEnter = () => {
    writeFocusRoomEntrySession()

    if (hasEntered()) {
      return
    }

    events.enterFocusRoom()
  }

  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()
    const updateAutomaticPeriod = () => setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const timer = window.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)

    if (hasEntered() || readFocusRoomEntrySession()) {
      events.enterFocusRoom()
    } else {
      setIsEntryVisible(true)
    }

    setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      setMotionInput('gyroscope')
    }

    updateAutomaticPeriod()
    onCleanup(() => window.clearInterval(timer))
  })

  return (
    <section aria-label="Pomo" class="pomo-studio relative h-dvh w-full overflow-hidden">
      <figure
        aria-label={selectedScene().label}
        class="pomo-scene relative m-0 h-full w-full overflow-hidden bg-background"
        role="img"
      >
        <Show when={!hasSceneRendered()}>
          <PSceneFallback />
        </Show>
        <Show when={scenePreferences.isReady() && sceneStyleController.isReady()}>
          <PSceneCanvas
            activity={scenePreferences.activity()}
            depthSource={selectedScene().depthSource}
            gaze={sceneGaze()}
            motionInput={motionInput()}
            motionMode={motionMode()}
            onLoadingChange={handleLoadingChange}
            onMotionInputChange={setMotionInput}
            source={selectedScene().source}
            sceneId={selectedScene().id}
            sceneStyle={sceneStyleController.sceneStyle()}
            time={time()}
            viseme={activeViseme()}
          />
        </Show>
      </figure>

      <div class={CLASSES.ui} hidden={!hasEntered()}>
        <Show when={hasEntered()}>
          <PStudioEvents
            isPlayerExpanded={isPlayerExpanded()}
            onPlayerExpandedChange={setIsPlayerExpanded}
            onPomodoroPresentationChange={setPomodoroPresentation}
            onTrackChange={setCurrentTrack}
            pomoSay={pomoSay}
            sceneStyle={sceneStyleController.sceneStyle()}
          />
          <Show when={scenePreferences.isReady()}>
            <SceneToolbar
              activity={scenePreferences.activity()}
              canUseGyroscope={canUseGyroscope()}
              gaze={sceneGaze()}
              isSceneTransitioning={isSceneLoading() && hasSceneRendered()}
              onActivityChange={scenePreferences.onActivityChange}
              onGazeChange={scenePreferences.onGazeChange}
              onMotionInputChange={setMotionInput}
              onMotionModeChange={setMotionMode}
              onScreenSaverDelayChange={screenSaver.onDelayChange}
              onSceneStyleChange={sceneStyleController.onSceneStyleChange}
              onTimeModeChange={scenePreferences.onTimeModeChange}
              onWeatherCityChange={weather.onCityChange}
              onWeatherEnabledChange={weather.onEnabledChange}
              screenSaverDelay={screenSaver.delay()}
              sceneStyle={sceneStyleController.sceneStyle()}
              motionInput={motionInput()}
              motionMode={motionMode()}
              time={time()}
              timeMode={scenePreferences.timeMode()}
              weatherCitySlug={weather.citySlug()}
              weatherEnabled={weather.enabled()}
              weatherState={weather.state()}
            />
          </Show>
        </Show>
      </div>
      <Show when={isEntryVisible()}>
        <PEntry
          isExiting={hasEntered()}
          onEnter={handleEnter}
          onExitComplete={() => setIsEntryVisible(false)}
        />
      </Show>
      <PScreenSaver
        isActive={hasEntered() && screenSaver.isActive()}
        onDismiss={screenSaver.onDismiss}
        timer={{
          status: pomodoroPresentation().statusLabel,
          time: pomodoroPresentation().timeLabel,
        }}
        track={currentTrack()}
      />
    </section>
  )
}
