import {visibilityInterval} from 'src/utils/visibility-interval'
import * as m from '@paraglide/message'
import {useStudioTourHint} from './use-studio-tour-hint'
import {useUiAutoHide} from 'src/features/ui-auto-hide'
import {useStudioDesktopSceneSettings} from './use-studio-desktop-scene-settings'
import {type BackgroundController, useBackground} from '../../features/background'
import {Player as FramePlayer} from '../frame/Player'
import {createMemo, createSignal, onCleanup, onMount, type Setter, Show} from 'solid-js'

import {
  getPScene,
  type PSceneId,
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../../features/focus-room-animation'
import {usePEvents} from '../../features/focus-room-dialogue/event-context'
import {
  type PDisplayPreferencesController,
  usePDisplayPreferences,
} from '../../features/focus-room-display-preferences'
import {
  readFocusRoomEntrySession,
  writeFocusRoomEntrySession,
} from '../../features/focus-room-entry'
import type {PViseme} from '../../features/lip-sync'
import {
  type PActivity,
  type PGaze,
  usePScenePreferences,
} from '../../features/focus-room-scene-preferences'
import {getLocalizedSceneLabel} from '../../features/localization'
import {
  getAutomaticScenePeriod,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../../features/focus-room-time'
import {usePSay} from '../../features/pomo-webmcp'
import {useWeather, type WeatherSceneCondition} from '../../features/weather'
import {useDesktopMode, useDesktopSafeAreaTop} from '../../features/desktop-mode'
import {PEntry} from './Entry'
import {resolvePSceneViseme} from '../pomo-scene-options'
import {PSceneFallback} from './SceneFallback'
import {SceneModelDownloadFallback} from './ModelDownloadFallback'
import {CLASSES, SceneTime} from './shared'
import {PStudioScene} from './Scene'
import {PStudioEvents} from './Events'
import {SceneToolbar} from './Toolbar'
import {useStudioScreenSaver} from './use-screen-saver'
import {useDialogueSceneGaze} from '../use-dialogue-scene-gaze'
import {StudioOverlay} from './StudioOverlay'
import {useStudioTour} from './use-tour'
import {DesktopSurfaceHandle} from '../desktop-surface/DesktopSurfaceHandle'

const AUTOMATIC_PERIOD_REFRESH = 60_000

const getDesktopSafeAreaStyle = (inset: number) =>
  inset > 0 ? {'--pomo-safe-area-inset-top': `${inset}px`} : undefined

interface SceneAsset {
  readonly depthSource: string
  readonly id: PSceneId
  readonly label: string
  readonly source: string
}

const getSceneAsset = (
  time: SceneTime,
  activity: PActivity,
  gaze: PGaze,
  sceneStyle: PSceneStyle,
): SceneAsset => {
  const scene = getPScene(time, activity, gaze)

  return {
    depthSource: scene.depthSources[sceneStyle],
    id: scene.id,
    label: getLocalizedSceneLabel(time, activity, gaze),
    source: scene.source,
  }
}

const useStudioEntry = (events: ReturnType<typeof usePEvents>) => {
  const [isVisible, setIsVisible] = createSignal(import.meta.env.VITE_POMO_IS_DESKTOP !== 'true')
  const restore = () => {
    if (import.meta.env.VITE_POMO_IS_DESKTOP === 'true') {
      setIsVisible(false)
      if (!events.hasEnteredFocusRoom()) {
        events.enterFocusRoom()
      }
      return
    }

    if (events.hasEnteredFocusRoom() || readFocusRoomEntrySession()) {
      setIsVisible(false)
      events.enterFocusRoom()
    } else {
      setIsVisible(true)
    }
  }
  const enter = () => {
    const isFirstEntry = !events.hasEnteredFocusRoom() && !readFocusRoomEntrySession()
    writeFocusRoomEntrySession()
    if (!events.hasEnteredFocusRoom()) {
      events.enterFocusRoom()
    }
    return isFirstEntry
  }

  return {enter, hide: () => setIsVisible(false), isVisible, restore}
}

const DesktopWallpaperEventActionFallback = () => {
  const events = usePEvents()

  onMount(() => {
    const unregister = events.registerEventActionExecutor(() => undefined)
    onCleanup(unregister)
  })

  return null
}

const createLoadingHandler =
  (setLoading: Setter<boolean>, setRendered: Setter<boolean>) => (isLoading: boolean) => {
    setLoading(isLoading)
    setRendered((hasRendered) => hasRendered || !isLoading)
  }

interface StudioSceneViewProps {
  readonly background: BackgroundController
  readonly activity: PActivity
  readonly activeViseme: PViseme
  readonly hasSceneRendered: boolean
  readonly isDesktopWallpaper: boolean
  readonly motionInput: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly onLoadingChange: (isLoading: boolean) => void
  readonly onMotionInputChange: (motionInput: PSceneMotionInput) => void
  readonly scene: SceneAsset
  readonly sceneGaze: PGaze
  readonly sceneStyle: PSceneStyle
  readonly time: SceneTime
  readonly weatherCondition?: WeatherSceneCondition
  readonly isReady: boolean
  readonly styleReady: boolean
}

const StudioSceneView = (props: StudioSceneViewProps) => (
  <Show when={props.background.ready() || props.background.error() !== null}>
    <Show
      when={props.background.preferences().mode === 'character'}
      fallback={<FramePlayer background={props.background} />}
    >
      <figure
        aria-label={props.scene.label}
        class="pomo-scene relative m-0 h-full w-full overflow-hidden bg-background"
        role="img"
      >
        <Show when={!props.hasSceneRendered && !props.isDesktopWallpaper}>
          <PSceneFallback />
        </Show>
        <Show when={props.isReady && props.styleReady}>
          <PStudioScene
            activity={props.activity}
            depthSource={props.scene.depthSource}
            gaze={props.sceneGaze}
            interactive={!props.isDesktopWallpaper}
            motionInput={props.motionInput}
            motionMode={props.motionMode}
            onLoadingChange={props.onLoadingChange}
            onMotionInputChange={props.onMotionInputChange}
            source={props.scene.source}
            sceneId={props.scene.id}
            sceneStyle={props.sceneStyle}
            time={props.time}
            viseme={props.activeViseme}
            weatherCondition={props.weatherCondition}
          />
        </Show>
      </figure>
    </Show>
  </Show>
)

interface StudioRuntimeOptions {
  readonly entry: ReturnType<typeof useStudioEntry>
  readonly setAutomaticPeriod: Setter<ScenePeriod>
  readonly setCanUseGyroscope: Setter<boolean>
  readonly setMotionInput: Setter<PSceneMotionInput>
}

const useStudioRuntime = (options: StudioRuntimeOptions) => {
  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()
    const updateAutomaticPeriod = () =>
      options.setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const stopPeriodRefresh = visibilityInterval({
      callback: updateAutomaticPeriod,
      interval: AUTOMATIC_PERIOD_REFRESH,
      runOnVisible: true,
    })
    options.entry.restore()
    options.setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      options.setMotionInput('gyroscope')
    }

    updateAutomaticPeriod()
    onCleanup(stopPeriodRefresh)
  })
}

const useStudioViseme = (
  events: ReturnType<typeof usePEvents>,
  pomoSay: ReturnType<typeof usePSay>,
) => {
  const viseme = createMemo(() =>
    resolvePSceneViseme(
      events.activeViseme(),
      events.isDialoguePlaying(),
      pomoSay.speechText(),
      pomoSay.activeViseme(),
    ),
  )
  return viseme
}

const toolbarVisibility = (preferences: PDisplayPreferencesController) => ({
  get featureRequestVisible() {
    return preferences.featureRequestVisible()
  },
  get memoryAssistVisible() {
    return preferences.memoryAssistVisible()
  },
  onFeatureRequestVisibleChange: preferences.onFeatureRequestVisibleChange,
  onMemoryAssistVisibleChange: preferences.onMemoryAssistVisibleChange,
  onPlayerVisibleChange: preferences.onPlayerVisibleChange,
  onPomodoroVisibleChange: preferences.onPomodoroVisibleChange,
  onToolsButtonVisibleChange: preferences.onToolsButtonVisibleChange,
  get playerVisible() {
    return preferences.playerVisible()
  },
  get pomodoroVisible() {
    return preferences.pomodoroVisible()
  },
  get toolsButtonVisible() {
    return preferences.toolsButtonVisible()
  },
})

interface StudioUiProps {
  readonly background: BackgroundController
  readonly canUseGyroscope: boolean
  readonly desktopMode: ReturnType<typeof useDesktopMode>
  readonly displayPreferences: PDisplayPreferencesController
  readonly entry: ReturnType<typeof useStudioEntry>
  readonly hasEntered: boolean
  readonly hasSceneRendered: boolean
  readonly isPlayerExpanded: boolean
  readonly isSceneLoading: boolean
  readonly motionInput: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly onPlayerExpandedChange: (expanded: boolean) => void
  readonly pomoSay: ReturnType<typeof usePSay>
  readonly sceneGaze: PGaze
  readonly scenePreferences: ReturnType<typeof usePScenePreferences>
  readonly sceneSettings: ReturnType<typeof useStudioDesktopSceneSettings>
  readonly screenSaver: ReturnType<typeof useStudioScreenSaver>
  readonly sceneStyle: PSceneStyle
  readonly timeMode: SceneTimeMode
  readonly tour: ReturnType<typeof useStudioTour>
  readonly tourHint: ReturnType<typeof useStudioTourHint>
  readonly uiAutoHide: ReturnType<typeof useUiAutoHide>
  readonly weather: ReturnType<typeof useWeather>
}

const StudioUi = (props: StudioUiProps) => (
  <>
    <div
      class={CLASSES.ui}
      classList={{'!hidden': props.uiAutoHide.hidden()}}
      hidden={!props.hasEntered || props.uiAutoHide.hidden()}
    >
      <Show when={props.hasEntered}>
        <PStudioEvents
          pomodoroVisible={
            props.displayPreferences.isReady() && props.displayPreferences.pomodoroVisible()
          }
          playerVisible={
            props.displayPreferences.isReady() && props.displayPreferences.playerVisible()
          }
          dialogueComposerVisible={props.displayPreferences.dialogueComposerVisible()}
          isPlayerExpanded={props.isPlayerExpanded}
          onMusicPlayingChange={props.screenSaver.onMusicPlayingChange}
          onPlayerExpandedChange={props.onPlayerExpandedChange}
          onPomodoroPresentationChange={props.screenSaver.onPomodoroPresentationChange}
          onTrackChange={props.screenSaver.onTrackChange}
          pomoSay={props.pomoSay}
          sceneStyle={props.sceneStyle}
        />
        <Show when={props.scenePreferences.isReady() && props.displayPreferences.isReady()}>
          <SceneToolbar
            uiAutoHide={props.uiAutoHide}
            {...props.sceneSettings}
            background={props.background}
            {...toolbarVisibility(props.displayPreferences)}
            activity={props.scenePreferences.activity()}
            canUseGyroscope={props.canUseGyroscope}
            dialogueComposerVisible={props.displayPreferences.dialogueComposerVisible()}
            gaze={props.sceneGaze}
            isSceneTransitioning={
              props.background.preferences().mode === 'character' &&
              props.isSceneLoading &&
              props.hasSceneRendered
            }
            onDialogueComposerVisibleChange={
              props.displayPreferences.onDialogueComposerVisibleChange
            }
            onTourOpen={props.tourHint.openTour}
            tourButtonVisible={props.displayPreferences.tourButtonVisible()}
            onTourButtonVisibleChange={props.displayPreferences.onTourButtonVisibleChange}
            screenSaverDelay={props.screenSaver.delay()}
            sceneStyle={props.sceneStyle}
            motionInput={props.motionInput}
            motionMode={props.motionMode}
            timeMode={props.timeMode}
            weatherEnabled={props.weather.enabled()}
            weatherLocation={props.weather.location()}
            weatherSceneMode={props.weather.sceneMode()}
            weatherState={props.weather.state()}
            desktopMode={props.desktopMode.mode()}
            desktopModeError={props.desktopMode.error()}
            isDesktopModeChanging={props.desktopMode.isChanging()}
            onDesktopModeChange={props.desktopMode.onModeChange}
          />
        </Show>
      </Show>
    </div>
    <Show when={props.entry.isVisible()}>
      <PEntry
        isExiting={props.hasEntered}
        onEnter={props.tourHint.enter}
        onExitComplete={props.entry.hide}
      />
    </Show>
    <SceneModelDownloadFallback
      isVisible={!props.hasEntered || !props.scenePreferences.isReady()}
    />
    <div hidden={props.uiAutoHide.hidden()}>
      <StudioOverlay
        uiAutoHideEnabled={props.uiAutoHide.enabled()}
        displayPreferences={props.displayPreferences}
        desktopMode={props.desktopMode.mode()}
        entryVisible={props.entry.isVisible()}
        hasEntered={props.hasEntered}
        isTourHintVisible={props.tourHint.visible()}
        onDismissTourHint={props.tourHint.dismiss}
        screenSaver={props.screenSaver}
        tour={props.tour}
        tourButtonVisible={props.displayPreferences.tourButtonVisible()}
      />
    </div>
  </>
)

export const PStudio = () => {
  const uiAutoHide = useUiAutoHide()
  const background = useBackground()
  const events = usePEvents()
  const pomoSay = usePSay({onBeforeSpeech: events.onStopDialoguePlayback})
  const [automaticPeriod, setAutomaticPeriod] = createSignal<ScenePeriod>('day')
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('drag')
  const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
  const [canUseGyroscope, setCanUseGyroscope] = createSignal(false)
  const [isSceneLoading, setIsSceneLoading] = createSignal(true)
  const [hasSceneRendered, setHasSceneRendered] = createSignal(false)
  const [isPlayerExpanded, setIsPlayerExpanded] = createSignal(false)
  const tour = useStudioTour()
  const hasEntered = events.hasEnteredFocusRoom
  const entry = useStudioEntry(events)
  const screenSaver = useStudioScreenSaver()
  const weather = useWeather()
  const desktopMode = useDesktopMode({isSurfaceOwner: true})
  const isDesktopWallpaper = createMemo(() => desktopMode.mode() === 'desktop')
  const isDesktopWidget = createMemo(() => desktopMode.mode() === 'widget')
  const desktopSafeAreaTop = useDesktopSafeAreaTop(desktopMode.mode)
  const displayPreferences = usePDisplayPreferences()
  const scenePreferences = usePScenePreferences()
  const style = usePSceneStyle()
  const time = createMemo(() => resolveScenePeriod(scenePreferences.timeMode(), automaticPeriod()))
  const sceneGaze = useDialogueSceneGaze(
    scenePreferences.gaze,
    events.isDialoguePlaying,
    pomoSay.isPlaying,
  )
  const sceneSettings = useStudioDesktopSceneSettings({
    handlers: {
      onActivityChange: scenePreferences.onActivityChange,
      onGazeChange: scenePreferences.onGazeChange,
      onMotionInputChange: setMotionInput,
      onMotionModeChange: setMotionMode,
      onSceneStyleChange: style.onSceneStyleChange,
      onScreenSaverDelayChange: screenSaver.onDelayChange,
      onTimeModeChange: scenePreferences.onTimeModeChange,
      onWeatherEnabledChange: weather.onEnabledChange,
      onWeatherLocationChange: weather.onLocationChange,
      onWeatherSceneModeChange: weather.onSceneModeChange,
    },
    motionInput,
    motionMode,
  })
  const selectedScene = createMemo(() =>
    getSceneAsset(time(), scenePreferences.activity(), sceneGaze(), style.sceneStyle()),
  )
  const activeViseme = useStudioViseme(events, pomoSay)
  const tourHint = useStudioTourHint(entry.enter, () => tour.setIsOpen(true))
  useStudioRuntime({entry, setAutomaticPeriod, setCanUseGyroscope, setMotionInput})
  return (
    <section
      aria-label="Pomo"
      class="relative h-dvh w-full overflow-hidden"
      classList={{
        'pointer-events-none': isDesktopWallpaper(),
        'rounded-panel': isDesktopWidget(),
      }}
      ref={tour.setStudioElement}
      style={getDesktopSafeAreaStyle(desktopSafeAreaTop())}
    >
      <StudioSceneView
        background={background}
        activity={scenePreferences.activity()}
        activeViseme={activeViseme()}
        hasSceneRendered={hasSceneRendered()}
        isDesktopWallpaper={isDesktopWallpaper()}
        isReady={scenePreferences.isReady() && weather.isReady()}
        motionInput={motionInput()}
        motionMode={motionMode()}
        onLoadingChange={createLoadingHandler(setIsSceneLoading, setHasSceneRendered)}
        onMotionInputChange={sceneSettings.onMotionInputChange}
        scene={selectedScene()}
        sceneGaze={sceneGaze()}
        sceneStyle={style.sceneStyle()}
        styleReady={style.isReady()}
        time={time()}
        weatherCondition={weather.sceneCondition()}
      />
      <Show when={!isDesktopWallpaper()}>
        <StudioUi
          background={background}
          canUseGyroscope={canUseGyroscope()}
          desktopMode={desktopMode}
          displayPreferences={displayPreferences}
          entry={entry}
          hasEntered={hasEntered()}
          hasSceneRendered={hasSceneRendered()}
          isPlayerExpanded={isPlayerExpanded()}
          isSceneLoading={isSceneLoading()}
          motionInput={motionInput()}
          motionMode={motionMode()}
          onPlayerExpandedChange={setIsPlayerExpanded}
          pomoSay={pomoSay}
          sceneGaze={sceneGaze()}
          scenePreferences={scenePreferences}
          sceneSettings={sceneSettings}
          screenSaver={screenSaver}
          sceneStyle={style.sceneStyle()}
          timeMode={scenePreferences.timeMode()}
          tour={tour}
          tourHint={tourHint}
          uiAutoHide={uiAutoHide}
          weather={weather}
        />
      </Show>
      <Show when={isDesktopWallpaper()}>
        <DesktopWallpaperEventActionFallback />
      </Show>
      <Show when={import.meta.env.VITE_POMO_IS_DESKTOP === 'true' && isDesktopWidget()}>
        <DesktopSurfaceHandle
          class="absolute left-1/2 top-2 -translate-x-1/2"
          title={m.desktop_mode_widget()}
        />
      </Show>
    </section>
  )
}
