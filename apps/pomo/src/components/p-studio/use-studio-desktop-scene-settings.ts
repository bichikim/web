import type {Accessor} from 'solid-js'
import {
  type DesktopSceneSettingsHandlers,
  useDesktopSceneSettingsPublisher,
} from 'src/features/desktop-mode'
import type {PSceneMotionInput, PSceneMotionMode} from 'src/features/focus-room-animation'

export interface StudioDesktopSceneSettingsProps {
  readonly handlers: Required<DesktopSceneSettingsHandlers>
  readonly motionInput: Accessor<PSceneMotionInput>
  readonly motionMode: Accessor<PSceneMotionMode>
}

export const useStudioDesktopSceneSettings = (
  props: StudioDesktopSceneSettingsProps,
): Required<DesktopSceneSettingsHandlers> => {
  const {handlers} = props
  const publisher = useDesktopSceneSettingsPublisher({
    handlers,
    snapshot: () => [
      {name: 'motionInput', value: props.motionInput()},
      {name: 'motionMode', value: props.motionMode()},
    ],
  })

  return {
    onActivityChange: (value) => {
      handlers.onActivityChange(value)
      publisher.publish({name: 'activity', value})
    },
    onGazeChange: (value) => {
      handlers.onGazeChange(value)
      publisher.publish({name: 'gaze', value})
    },
    onMotionInputChange: (value) => {
      handlers.onMotionInputChange(value)
      publisher.publish({name: 'motionInput', value})
    },
    onMotionModeChange: (value) => {
      handlers.onMotionModeChange(value)
      publisher.publish({name: 'motionMode', value})
    },
    onSceneStyleChange: (value) => {
      handlers.onSceneStyleChange(value)
      publisher.publish({name: 'sceneStyle', value})
    },
    onScreenSaverDelayChange: (value) => {
      handlers.onScreenSaverDelayChange(value)
      publisher.publish({name: 'screenSaverDelay', value})
    },
    onTimeModeChange: (value) => {
      handlers.onTimeModeChange(value)
      publisher.publish({name: 'timeMode', value})
    },
    onWeatherEnabledChange: (value) => {
      handlers.onWeatherEnabledChange(value)
      publisher.publish({name: 'weatherEnabled', value})
    },
    onWeatherLocationChange: (value) => {
      handlers.onWeatherLocationChange(value)
      publisher.publish({name: 'weatherLocation', value})
    },
    onWeatherSceneModeChange: (value) => {
      handlers.onWeatherSceneModeChange(value)
      publisher.publish({name: 'weatherSceneMode', value})
    },
  }
}
