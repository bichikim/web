import {type PSceneStyle} from '../../features/focus-room-animation/index'
import type {PTrack} from '../../features/focus-room-audio/index'
import {createMemo} from 'solid-js'
import {
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
  useRandomEvent,
} from '../../features/focus-room-dialogue/index'
import {type PSayController} from '../../features/pomo-webmcp/index'
import {PDialoguePlayer} from '../PDialoguePlayer'
import {PFeedStatus} from '../PFeedStatus'
import {PMusicPlayer} from '../PMusicPlayer'
import {PPomodoro, type PPomodoroPresentation} from '../PPomodoro'
import {CLASSES} from './shared'

interface PStudioEventsProps {
  readonly isPlayerExpanded: boolean
  readonly onMusicPlayingChange: (isPlaying: boolean) => void
  readonly onPlayerExpandedChange: (isExpanded: boolean) => void
  readonly onPomodoroPresentationChange: (presentation: PPomodoroPresentation) => void
  readonly onTrackChange: (track: PTrack | null) => void
  readonly pomoSay: PSayController
  readonly sceneStyle: PSceneStyle
}

export const PStudioEvents = (props: PStudioEventsProps) => {
  const events = usePEvents()
  const isDialoguePresented = createMemo((wasPresented) => {
    const hasVisibleContent =
      events.activeText() !== null ||
      props.pomoSay.speechText() !== null ||
      events.isDialoguePlaybackBlocked()

    return hasVisibleContent || (wasPresented && events.scheduledDialogueCount() > 0)
  }, false)
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
        data-dialogue-active={isDialoguePresented() ? '' : undefined}
        data-player-expanded={props.isPlayerExpanded ? '' : undefined}
      >
        <PMusicPlayer
          expanded={props.isPlayerExpanded}
          onPlayingChange={props.onMusicPlayingChange}
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
