import {createMemo, createSignal, onCleanup, onMount, Show} from 'solid-js'

import {
  getPScene,
  type PSceneId,
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../features/focus-room-animation'
import type {PTrack} from '../features/focus-room-audio'
import {usePEvents} from '../features/focus-room-dialogue'
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
import {useScreenSaver} from '../features/screen-saver'
import {useWeather} from '../features/weather'
import * as m from '@paraglide/message'
import {PEntry} from './p-studio/Entry'
import {resolvePSceneViseme} from './pomo-scene-options'
import {type PPomodoroPresentation} from './PPomodoro'
import {PSceneFallback} from './p-studio/SceneFallback'
import {PScreenSaver} from './PScreenSaver'
import {CLASSES, SceneTime} from './p-studio/shared'
import {PStudioScene} from './p-studio/Scene'
import {PStudioEvents} from './p-studio/Events'
import {SceneToolbar} from './p-studio/Toolbar'
import {useDialogueSceneGaze} from './use-dialogue-scene-gaze'

const AUTOMATIC_PERIOD_REFRESH = 60_000
const getInitialPomodoroPresentation = () =>
  ({
    phaseLabel: m.pomodoro_focus(),
    statusLabel: m.pomodoro_focus_ready(),
    timeLabel: '25:00',
  }) satisfies PPomodoroPresentation

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
    getInitialPomodoroPresentation(),
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
