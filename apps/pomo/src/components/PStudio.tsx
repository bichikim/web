import {useStudioTourHint} from './p-studio/use-studio-tour-hint'
import {useUiAutoHide} from 'src/features/ui-auto-hide'
import {useStudioDesktopSceneSettings} from './p-studio/use-studio-desktop-scene-settings'
import {type BackgroundController, useBackground} from '../features/background'
import {Player as FramePlayer} from './frame/Player'
import {createMemo, createSignal, onCleanup, onMount, type Setter, Show} from 'solid-js'

import {
  getPScene,
  type PSceneId,
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../features/focus-room-animation'
import {usePEvents} from '../features/focus-room-dialogue/event-context'
import {
  type PDisplayPreferencesController,
  usePDisplayPreferences,
} from '../features/focus-room-display-preferences'
import {readFocusRoomEntrySession, writeFocusRoomEntrySession} from '../features/focus-room-entry'
import type {PViseme} from '../features/lip-sync'
import {
  type PActivity,
  type PGaze,
  usePScenePreferences,
} from '../features/focus-room-scene-preferences'
import {getLocalizedSceneLabel} from '../features/localization'
import {
  getAutomaticScenePeriod,
  resolveScenePeriod,
  type ScenePeriod,
} from '../features/focus-room-time'
import {usePSay} from '../features/pomo-webmcp'
import {useWeather, type WeatherSceneCondition} from '../features/weather'
import {useDesktopMode, useDesktopSafeAreaTop} from '../features/desktop-mode'
import {PEntry} from './p-studio/Entry'
import {resolvePSceneViseme} from './pomo-scene-options'
import {PSceneFallback} from './p-studio/SceneFallback'
import {SceneModelDownloadFallback} from './p-studio/ModelDownloadFallback'
import {CLASSES, SceneTime} from './p-studio/shared'
import {PStudioScene} from './p-studio/Scene'
import {PStudioEvents} from './p-studio/Events'
import {SceneToolbar} from './p-studio/Toolbar'
import {useStudioScreenSaver} from './p-studio/use-screen-saver'
import {useDialogueSceneGaze} from './use-dialogue-scene-gaze'
import {StudioOverlay} from './p-studio/StudioOverlay'
import {useStudioTour} from './p-studio/use-tour'

const AUTOMATIC_PERIOD_REFRESH = 60_000

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
  const [isVisible, setIsVisible] = createSignal(false)
  const restore = () => {
    if (events.hasEnteredFocusRoom() || readFocusRoomEntrySession()) {
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
  readonly motionInput: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly onLoadingChange: (isLoading: boolean) => void
  readonly onMotionInputChange: (motionInput: PSceneMotionInput) => void
  readonly scene: SceneAsset
  readonly sceneGaze: PGaze
  readonly sceneStyle: PSceneStyle
  readonly time: SceneTime
  readonly weatherCondition: WeatherSceneCondition
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
        <Show when={!props.hasSceneRendered}>
          <PSceneFallback />
        </Show>
        <Show when={props.isReady && props.styleReady}>
          <PStudioScene
            activity={props.activity}
            depthSource={props.scene.depthSource}
            gaze={props.sceneGaze}
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
    const timer = globalThis.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)
    options.entry.restore()
    options.setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      options.setMotionInput('gyroscope')
    }

    updateAutomaticPeriod()
    onCleanup(() => globalThis.clearInterval(timer))
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
  get memoryAssistVisible() {
    return preferences.memoryAssistVisible()
  },
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
      class="pomo-studio relative h-dvh w-full overflow-hidden"
      ref={tour.setStudioElement}
      style={{'--pomo-safe-area-inset-top': `${desktopSafeAreaTop()}px`}}
    >
      <StudioSceneView
        background={background}
        activity={scenePreferences.activity()}
        activeViseme={activeViseme()}
        hasSceneRendered={hasSceneRendered()}
        isReady={scenePreferences.isReady()}
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
      <div
        class={CLASSES.ui}
        classList={{'!hidden': uiAutoHide.hidden()}}
        hidden={!hasEntered() || desktopMode.mode() === 'desktop' || uiAutoHide.hidden()}
      >
        <Show when={hasEntered() && desktopMode.mode() !== 'desktop'}>
          <PStudioEvents
            pomodoroVisible={displayPreferences.isReady() && displayPreferences.pomodoroVisible()}
            playerVisible={displayPreferences.isReady() && displayPreferences.playerVisible()}
            dialogueComposerVisible={displayPreferences.dialogueComposerVisible()}
            isPlayerExpanded={isPlayerExpanded()}
            onMusicPlayingChange={screenSaver.onMusicPlayingChange}
            onPlayerExpandedChange={setIsPlayerExpanded}
            onPomodoroPresentationChange={screenSaver.onPomodoroPresentationChange}
            onTrackChange={screenSaver.onTrackChange}
            pomoSay={pomoSay}
            sceneStyle={style.sceneStyle()}
          />
          <Show when={scenePreferences.isReady() && displayPreferences.isReady()}>
            <SceneToolbar
              uiAutoHide={uiAutoHide}
              {...sceneSettings}
              background={background}
              {...toolbarVisibility(displayPreferences)}
              activity={scenePreferences.activity()}
              canUseGyroscope={canUseGyroscope()}
              dialogueComposerVisible={displayPreferences.dialogueComposerVisible()}
              gaze={sceneGaze()}
              isSceneTransitioning={
                background.preferences().mode === 'character' &&
                isSceneLoading() &&
                hasSceneRendered()
              }
              onDialogueComposerVisibleChange={displayPreferences.onDialogueComposerVisibleChange}
              onTourOpen={tourHint.openTour}
              tourButtonVisible={displayPreferences.tourButtonVisible()}
              onTourButtonVisibleChange={displayPreferences.onTourButtonVisibleChange}
              screenSaverDelay={screenSaver.delay()}
              sceneStyle={style.sceneStyle()}
              motionInput={motionInput()}
              motionMode={motionMode()}
              timeMode={scenePreferences.timeMode()}
              weatherEnabled={weather.enabled()}
              weatherLocation={weather.location()}
              weatherSceneMode={weather.sceneMode()}
              weatherState={weather.state()}
              desktopMode={desktopMode.mode()}
              desktopModeError={desktopMode.error()}
              isDesktopModeChanging={desktopMode.isChanging()}
              onDesktopModeChange={desktopMode.onModeChange}
            />
          </Show>
        </Show>
      </div>
      <Show when={entry.isVisible()}>
        <PEntry isExiting={hasEntered()} onEnter={tourHint.enter} onExitComplete={entry.hide} />
      </Show>
      <SceneModelDownloadFallback isVisible={!hasEntered() || !scenePreferences.isReady()} />
      <div hidden={uiAutoHide.hidden()}>
        <StudioOverlay
          uiAutoHideEnabled={uiAutoHide.enabled()}
          displayPreferences={displayPreferences}
          desktopMode={desktopMode.mode()}
          entryVisible={entry.isVisible()}
          hasEntered={hasEntered()}
          isTourHintVisible={tourHint.visible()}
          onDismissTourHint={tourHint.dismiss}
          screenSaver={screenSaver}
          tour={tour}
          tourButtonVisible={displayPreferences.tourButtonVisible()}
        />
      </div>
    </section>
  )
}
