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
import {readFocusRoomEntrySession, writeFocusRoomEntrySession} from '../features/focus-room-entry'
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
import {useWeather} from '../features/weather'
import {
  isDesktopBackgroundMode,
  useDesktopMode,
  useDesktopSafeAreaTop,
  useDesktopSceneSettingsListener,
} from '../features/desktop-mode'
import {cssPixelsToRem} from '../features/css-units'
import {PEntry} from './p-studio/Entry'
import {resolvePSceneViseme} from './pomo-scene-options'
import {PSceneFallback} from './p-studio/SceneFallback'
import {SceneModelDownloadFallback} from './p-studio/ModelDownloadFallback'
import {PScreenSaver} from './PScreenSaver'
import {CLASSES, SceneTime} from './p-studio/shared'
import {PStudioScene} from './p-studio/Scene'
import {PStudioEvents} from './p-studio/Events'
import {SceneToolbar} from './p-studio/Toolbar'
import {useStudioScreenSaver} from './p-studio/use-screen-saver'
import {useDialogueSceneGaze} from './use-dialogue-scene-gaze'

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
    writeFocusRoomEntrySession()
    if (!events.hasEnteredFocusRoom()) {
      events.enterFocusRoom()
    }
  }

  return {enter, hide: () => setIsVisible(false), isVisible, restore}
}

const createLoadingHandler =
  (setLoading: Setter<boolean>, setRendered: Setter<boolean>) => (isLoading: boolean) => {
    setLoading(isLoading)
    setRendered((hasRendered) => hasRendered || !isLoading)
  }

interface StudioDesktopSceneSettingsOptions {
  readonly scenePreferences: ReturnType<typeof usePScenePreferences>
  readonly sceneStyleController: ReturnType<typeof usePSceneStyle>
  readonly screenSaver: ReturnType<typeof useStudioScreenSaver>
  readonly setMotionInput: Setter<PSceneMotionInput>
  readonly setMotionMode: Setter<PSceneMotionMode>
  readonly weather: ReturnType<typeof useWeather>
}

const useStudioDesktopSceneSettings = (options: StudioDesktopSceneSettingsOptions) => {
  const {scenePreferences, sceneStyleController, screenSaver, weather} = options
  useDesktopSceneSettingsListener({
    onActivityChange: scenePreferences.onActivityChange,
    onGazeChange: scenePreferences.onGazeChange,
    onMotionInputChange: options.setMotionInput,
    onMotionModeChange: options.setMotionMode,
    onSceneStyleChange: sceneStyleController.onSceneStyleChange,
    onScreenSaverDelayChange: screenSaver.onDelayChange,
    onTimeModeChange: scenePreferences.onTimeModeChange,
    onWeatherEnabledChange: weather.onEnabledChange,
    onWeatherLocationChange: weather.onLocationChange,
    onWeatherSceneModeChange: weather.onSceneModeChange,
  })
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
  const entry = useStudioEntry(events)
  const screenSaver = useStudioScreenSaver()
  const weather = useWeather()
  const desktopMode = useDesktopMode({isSurfaceOwner: true})
  const desktopSafeAreaTop = useDesktopSafeAreaTop(desktopMode.mode)
  const scenePreferences = usePScenePreferences()
  const sceneStyleController = usePSceneStyle()
  const time = createMemo(() => resolveScenePeriod(scenePreferences.timeMode(), automaticPeriod()))
  const sceneGaze = useDialogueSceneGaze(
    scenePreferences.gaze,
    events.isDialoguePlaying,
    pomoSay.isPlaying,
  )
  const {sceneStyle} = sceneStyleController
  useStudioDesktopSceneSettings({
    scenePreferences,
    sceneStyleController,
    screenSaver,
    setMotionInput,
    setMotionMode,
    weather,
  })
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
  const handleLoadingChange = createLoadingHandler(setIsSceneLoading, setHasSceneRendered)
  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()
    const updateAutomaticPeriod = () => setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const timer = window.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)
    entry.restore()
    setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      setMotionInput('gyroscope')
    }

    updateAutomaticPeriod()
    onCleanup(() => window.clearInterval(timer))
  })

  return (
    <section
      aria-label="Pomo"
      class="pomo-studio relative h-dvh w-full overflow-hidden"
      style={{'--pomo-safe-area-inset-top': cssPixelsToRem(desktopSafeAreaTop())}}
    >
      <figure
        aria-label={selectedScene().label}
        class="pomo-scene relative m-0 h-full w-full overflow-hidden bg-background"
        role="img"
      >
        <Show when={!hasSceneRendered()}>
          <PSceneFallback />
        </Show>
        <Show when={scenePreferences.isReady() && sceneStyleController.isReady()}>
          <PStudioScene
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
            weatherCondition={weather.sceneCondition()}
          />
        </Show>
      </figure>

      <div class={CLASSES.ui} hidden={!hasEntered() || desktopMode.mode() === 'desktop'}>
        <Show when={hasEntered() && desktopMode.mode() !== 'desktop'}>
          <PStudioEvents
            isPlayerExpanded={isPlayerExpanded()}
            onMusicPlayingChange={screenSaver.onMusicPlayingChange}
            onPlayerExpandedChange={setIsPlayerExpanded}
            onPomodoroPresentationChange={screenSaver.onPomodoroPresentationChange}
            onTrackChange={screenSaver.onTrackChange}
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
              onWeatherEnabledChange={weather.onEnabledChange}
              onWeatherLocationChange={weather.onLocationChange}
              onWeatherSceneModeChange={weather.onSceneModeChange}
              screenSaverDelay={screenSaver.delay()}
              sceneStyle={sceneStyleController.sceneStyle()}
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
        <PEntry isExiting={hasEntered()} onEnter={entry.enter} onExitComplete={entry.hide} />
      </Show>
      <SceneModelDownloadFallback isVisible={!hasEntered() || !scenePreferences.isReady()} />
      <PScreenSaver
        isActive={
          hasEntered() && !isDesktopBackgroundMode(desktopMode.mode()) && screenSaver.isActive()
        }
        isMusicPlaying={screenSaver.isMusicPlaying()}
        onDismiss={screenSaver.onDismiss}
        timer={screenSaver.timer()}
        track={screenSaver.currentTrack()}
      />
    </section>
  )
}
