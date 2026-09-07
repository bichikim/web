import {type PSceneStyle} from '../../features/focus-room-animation/index'
import type {PTrack} from '../../features/focus-room-audio/index'
import {createMemo, createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
  useRandomEvent,
} from '../../features/focus-room-dialogue/index'
import {useMemoryReminders} from '../../features/memory-assist'
import {type PSayController} from '../../features/pomo-webmcp/index'
import {PDialogueComposer} from '../PDialogueComposer'
import {PDialoguePlayer} from '../PDialoguePlayer'
import {PFeedStatus} from '../PFeedStatus'
import {PFormMessage} from '../PFormMessage'
import {PModelDownloadConsent} from '../PModelDownloadConsent'
import {PMusicPlayer} from '../PMusicPlayer'
import {PPomodoro, type PPomodoroPresentation} from '../PPomodoro'
import './layout.css'
import {CLASSES} from './shared'
import {ONE_OFF_CHAT_MODEL, useOneOffChat} from './use-one-off-chat'
import {useReplySpeechQueue} from './use-reply-speech-queue'
import {useChildPresence} from './use-child-presence'
import {useMobileLayout} from './use-mobile-layout'

interface PStudioEventsProps {
  readonly dialogueComposerVisible: boolean
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
  const [mediaMessages, setMediaMessages] = createSignal<HTMLDivElement>()
  const hasMediaMessages = useChildPresence(mediaMessages)
  const isMobileLayout = useMobileLayout()
  const replySpeechQueue = useReplySpeechQueue({
    isOccupied: () =>
      events.activeText() !== null ||
      events.isDialoguePlaying() ||
      events.isDialoguePlaybackBlocked() ||
      events.scheduledDialogueCount() > 0 ||
      props.pomoSay.isPreparing() ||
      props.pomoSay.isPlaying(),
    speak: (text) => props.pomoSay.speak({text}),
  })
  const oneOffChat = useOneOffChat({
    onReply: replySpeechQueue.enqueue,
  })
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

  useMemoryReminders({events, onBeforePlayback: () => props.pomoSay.stop()})
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
        <div class={CLASSES.mediaControls}>
          <Show when={props.dialogueComposerVisible}>
            <PDialogueComposer
              autoExpand={isMobileLayout() && !hasMediaMessages()}
              loading={oneOffChat.isBusy() || props.pomoSay.isPreparing()}
              onSubmit={oneOffChat.submit}
            />
          </Show>
          <PMusicPlayer
            expanded={props.isPlayerExpanded}
            isDialogueActive={events.isDialoguePlaying() || props.pomoSay.isPlaying()}
            onPlayingChange={props.onMusicPlayingChange}
            onExpandedChange={props.onPlayerExpandedChange}
            onTrackChange={props.onTrackChange}
            sceneStyle={props.sceneStyle}
          />
        </div>
        <div class={CLASSES.mediaMessages} ref={setMediaMessages}>
          <Show when={oneOffChat.errorMessage()}>
            {(message) => <PFormMessage tone="error">{message()}</PFormMessage>}
          </Show>
          <PFeedStatus sceneStyle={props.sceneStyle} />
          <PDialoguePlayer
            externalText={props.pomoSay.speechText()}
            onStopExternalSpeech={props.pomoSay.stop}
            sceneStyle={props.sceneStyle}
          />
        </div>
      </div>
      <PModelDownloadConsent
        actionLabel={m.dialogue_composer_download_action_label()}
        downloadSize={ONE_OFF_CHAT_MODEL.downloadSize}
        isOpen={oneOffChat.downloadConsentOpen()}
        onCancel={oneOffChat.cancelDownloadConsent}
        onConfirm={oneOffChat.startDownload}
      />
    </>
  )
}
