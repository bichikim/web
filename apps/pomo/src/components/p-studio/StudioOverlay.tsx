import {Show} from 'solid-js'
import {type DesktopMode, isDesktopBackgroundMode} from 'src/features/desktop-mode'
import type {PDisplayPreferencesController} from 'src/features/focus-room-display-preferences'
import {PScreenSaver} from '../PScreenSaver'
import {PStudioTour} from './Tour'
import {PStudioTourHint} from './TourHint'
import type {useStudioScreenSaver} from './use-screen-saver'
import type {useStudioTour} from './use-tour'

interface StudioOverlayProps {
  readonly displayPreferences: PDisplayPreferencesController
  readonly desktopMode: DesktopMode
  readonly entryVisible: boolean
  readonly hasEntered: boolean
  readonly isTourHintVisible: boolean
  readonly onDismissTourHint: () => void
  readonly screenSaver: ReturnType<typeof useStudioScreenSaver>
  readonly tour: ReturnType<typeof useStudioTour>
  readonly tourButtonVisible: boolean
}

export const StudioOverlay = (props: StudioOverlayProps) => (
  <>
    <PStudioTour tour={props.tour} />
    <Show
      when={
        props.isTourHintVisible &&
        !props.entryVisible &&
        props.tourButtonVisible &&
        props.desktopMode !== 'desktop'
      }
    >
      <PStudioTourHint onDismiss={props.onDismissTourHint} />
    </Show>
    <PScreenSaver
      isActive={
        props.hasEntered &&
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
