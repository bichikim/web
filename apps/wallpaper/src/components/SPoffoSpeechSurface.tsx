import {useVoice} from '../features/voice/use-voice'
import {useSpeechLipSync} from '../features/lipsync'
import {voiceMessage} from '../features/voice/text'
import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import {codexPort, useCodexNotifications, useCodexTitles, useSpeechTarget} from '../features/codex'
import {useSpeechSize} from '../features/codex/use-speech-size'
import {useSpeechHitTest, useWidgetSpeech} from '../features/speech'
import {SCodexSpeechStack} from './SCodexSpeechStack'

export const SPoffoSpeechSurface = (props: {readonly widgetId?: string} = {}) => {
  const connection = useCodexNotifications()
  const target = useSpeechTarget()
  const settings = useWidgetSpeech(() => props.widgetId)
  const [content, setContent] = createSignal<HTMLDivElement | null>(null)
  const [surface, setSurface] = createSignal<HTMLElement | null>(null)
  const [scroll, setScroll] = createSignal(0)
  const sessions = createMemo(() =>
    connection.snapshot().sessions.filter((item) => item.phase !== 'idle'),
  )
  const titles = useCodexTitles({activities: sessions})
  const labeled = createMemo(() =>
    sessions().map((item) => ({
      ...item,
      title: item.title ?? titles().get(item.sessionId),
    })),
  )
  const [selected, setSelected] = createSignal<string | null>(null)
  const message = createMemo(() =>
    connection.snapshot().registered
      ? voiceMessage(
          sessions().find((item) => item.sessionId === selected()),
          connection.snapshot().questions,
        )
      : null,
  )
  const lipsync = useSpeechLipSync({
    message,
    speech: settings.speech,
    widgetId: () => props.widgetId,
  })
  const voice = useVoice({message, onShape: lipsync.audioShape, speech: settings.speech})
  const voiceNotice = () => voice.error() ?? settings.error() ?? undefined
  const frame = useSpeechSize(content, {
    viewport: surface,
  })
  const reverse = createMemo(() =>
    frame.overflow() ? target()?.anchor !== 'top' : target()?.anchor === 'top',
  )
  useSpeechHitTest({
    element: surface,
    layout: scroll,
    onError: (cause) => console.error('Poffo speech input failed', cause),
  })
  const handleScroll: JSX.EventHandler<HTMLElement, Event> = (event) =>
    setScroll(event.currentTarget.scrollTop)
  return (
    <main
      ref={setSurface}
      aria-label="Poffo Codex 말풍선"
      data-anchor={target()?.anchor ?? 'bottom'}
      class="box-border flex h-screen w-full bg-transparent px-9
      [padding-top:clamp(2.25rem,calc(2.25rem+var(--speech-inset-top)),calc(100vh-.75rem))]
      pb-3 data-[anchor=bottom]:pt-3
      data-[anchor=bottom]:[padding-bottom:clamp(2.25rem,calc(2.25rem+var(--speech-inset-bottom)),calc(100vh-.75rem))]
      [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        '--speech-inset-bottom': `${frame.overflow() ? 0 : (target()?.insetBottom ?? 0)}px`,
        '--speech-inset-top': `${frame.overflow() ? 0 : (target()?.insetTop ?? 0)}px`,
      }}
      classList={{
        'flex-col': !reverse(),
        'flex-col-reverse': reverse(),
        'overflow-clip': !frame.overflow(),
        'overflow-y-auto': frame.overflow(),
      }}
      tabIndex={0}
      onScroll={handleScroll}
    >
      <Show when={connection.snapshot().registered}>
        <div
          ref={setContent}
          data-anchor={target()?.anchor ?? 'bottom'}
          data-overflow={frame.overflow()}
          class="mt-auto shrink-0 data-[anchor=top]:mt-0 data-[anchor=top]:mb-auto
          data-[overflow=true]:mt-0 data-[overflow=true]:mb-0"
        >
          <SCodexSpeechStack
            anchor={target()?.anchor}
            activities={labeled()}
            wrap={settings.speech().wrap !== false}
            approvals={connection.snapshot().approvals}
            questions={connection.snapshot().questions}
            target={target()}
            maxHeight={target()?.maxHeight}
            layout={scroll()}
            onDismiss={connection.dismiss}
            onOpen={codexPort.openChat}
            onSelected={setSelected}
            voiceNotice={voiceNotice()}
            voiceState={voice.status()}
            onVoiceRetry={voice.retry}
          />
        </div>
      </Show>
    </main>
  )
}
