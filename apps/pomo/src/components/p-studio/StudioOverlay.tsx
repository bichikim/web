import {type DesktopMode, isDesktopBackgroundMode} from 'src/features/desktop-mode'
import type {PDisplayPreferencesController} from 'src/features/focus-room-display-preferences'
import {PScreenSaver} from '../p-screen-saver/PScreenSaver'
import {PStudioTour} from './Tour'
import type {useStudioScreenSaver} from './use-screen-saver'
import type {useStudioTour} from './use-tour'

interface StudioOverlayProps {
  readonly uiAutoHideEnabled?: boolean
  readonly displayPreferences: PDisplayPreferencesController
  readonly desktopMode: DesktopMode
  readonly hasEntered: boolean
  readonly screenSaver: ReturnType<typeof useStudioScreenSaver>
  readonly tour: ReturnType<typeof useStudioTour>
}

export const StudioOverlay = (props: StudioOverlayProps) => (
  <>
    <PStudioTour tour={props.tour} />
    <PScreenSaver
      isActive={
        props.hasEntered &&
        !props.uiAutoHideEnabled &&
        !isDesktopBackgroundMode(props.desktopMode) &&
        props.screenSaver.isActive()
      }
      isMusicPlaying={
        props.displayPreferences.isReady() &&
        props.displayPreferences.playerVisible() &&
        props.screenSaver.isMusicPlaying()
      }
      onDismiss={props.screenSaver.onDismiss}
      timer={
        props.displayPreferences.isReady() && props.displayPreferences.pomodoroVisible()
          ? props.screenSaver.timer()
          : undefined
      }
      track={
        props.displayPreferences.isReady() && props.displayPreferences.playerVisible()
          ? props.screenSaver.currentTrack()
          : null
      }
    />
  </>
)
