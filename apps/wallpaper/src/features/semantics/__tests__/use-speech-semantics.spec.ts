/** @vitest-environment jsdom */
import {batch, createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {VoiceMessage} from '../../voice/text'
import type {VoicePlayback} from '../../voice/types'
import type {VoiceStatus} from '../../voice/readout'
import {sendSemanticInput} from '../channel'
import {useSpeechSemantics} from '../use-speech-semantics'

vi.mock('../channel', () => ({
  sendSemanticInput: vi.fn().mockResolvedValue(undefined),
  subscribeSemanticReady: vi.fn().mockResolvedValue(vi.fn()),
}))
let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  vi.clearAllMocks()
})
const first = '실패해서 속상했어요. 자신감도 없었고요.'
const second = '그래도 다시 해봤어요. 이번엔 성공했어요!'
const third = '정말 고마워요.'
const message: VoiceMessage = {chat: 'chat', id: 'reply', text: [first, second, third].join('\n\n')}

it('should prefetch only one successor and follow audible text rather than queued audio', async () => {
  const test = createRoot((cleanup) => {
    dispose = cleanup
    const [playback, setPlayback] = createSignal<VoicePlayback | null>(null)
    const [status, setStatus] = createSignal<VoiceStatus>('generating')
    useSpeechSemantics({
      enabled: () => true,
      message: () => message,
      playback,
      status,
      voiceEnabled: () => true,
      widgetId: () => 'widget',
    })
    return {setPlayback, setStatus}
  })
  await Promise.resolve()
  expect(sendSemanticInput).toHaveBeenLastCalledWith({
    narration: {phase: 'preparing'},
    nextText: second,
    text: first,
    widgetId: 'widget',
  })
  batch(() => {
    test.setPlayback({message, offset: 0})
    test.setStatus('playing')
  })
  expect(sendSemanticInput).toHaveBeenLastCalledWith({
    narration: {phase: 'playing', readoutId: 'reply'},
    nextText: second,
    text: first,
    widgetId: 'widget',
  })
  test.setPlayback({message, offset: message.text.indexOf(second)})
  expect(sendSemanticInput).toHaveBeenLastCalledWith({
    narration: {phase: 'playing', readoutId: 'reply'},
    nextText: third,
    text: second,
    widgetId: 'widget',
  })
  test.setStatus('paused')
  expect(sendSemanticInput).toHaveBeenLastCalledWith(
    expect.objectContaining({narration: {phase: 'waiting'}, text: second}),
  )
  test.setStatus('idle')
  expect(sendSemanticInput).toHaveBeenLastCalledWith({
    narration: {phase: 'ended'},
    text: '',
    widgetId: 'widget',
  })
})

it('should ignore incomplete streaming text and use the latest completed segment without narration', async () => {
  const test = createRoot((cleanup) => {
    dispose = cleanup
    const [value, setValue] = createSignal<VoiceMessage>({
      ...message,
      complete: false,
      text: `${first}\n\n아직 작성`,
    })
    useSpeechSemantics({
      enabled: () => true,
      message: value,
      playback: () => null,
      status: () => 'idle',
      voiceEnabled: () => false,
      widgetId: () => 'widget',
    })
    return {setValue}
  })
  await Promise.resolve()
  expect(sendSemanticInput).toHaveBeenLastCalledWith({text: first, widgetId: 'widget'})
  test.setValue(message)
  expect(sendSemanticInput).toHaveBeenLastCalledWith({text: third, widgetId: 'widget'})
})
