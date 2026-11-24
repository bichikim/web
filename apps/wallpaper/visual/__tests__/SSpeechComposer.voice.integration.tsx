import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import speechUrl from '../../../wallpaper-web/public/speech/overview/audio.mp3?url'
import {SSpeechComposer} from '../../src/components/SSpeechComposer'
import {transcribeAudio} from '../../src/features/dictation/transcribe-audio'
import 'virtual:uno.css'

vi.mock('../../src/features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

test('should submit two real Silero speech turns through the character composer', async () => {
  const context = new AudioContext()
  const streams: MediaStreamAudioDestinationNode[] = []
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(async () => {
    const output = context.createMediaStreamDestination()
    streams.push(output)
    return output.stream
  })
  const response = await fetch(speechUrl)
  const buffer = await context.decodeAudioData(await response.arrayBuffer())
  const play = (output: MediaStreamAudioDestinationNode) => {
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(output)
    source.start(0, 0, 2.5)
  }
  const [draft, edit] = createSignal('')
  const [speaking, setSpeaking] = createSignal(false)
  const messages: string[] = []
  const send = () => {
    messages.push(draft())
    edit('')
    setSpeaking(true)
  }
  const activate = () => {
    context.resume()
  }
  vi.mocked(transcribeAudio).mockResolvedValueOnce('첫 번째 말').mockResolvedValueOnce('두 번째 말')
  render(() => (
    <div class="w-65 bg-teal-50 p-3" onClick={activate}>
      <SSpeechComposer
        continuous
        value={draft()}
        onEdit={edit}
        onSend={send}
        voiceBusy={speaking()}
      />
    </div>
  ))
  try {
    await page.getByRole('button', {name: '연속 대화 시작'}).click()
    const microphone = screen.getByRole('button', {name: '연속 대화 종료'})
    await expect.poll(() => microphone.title, {timeout: 5000}).toContain('듣는 중')
    play(streams[0])
    await expect.poll(() => messages, {timeout: 10_000}).toEqual(['첫 번째 말'])
    expect(streams).toHaveLength(1)
    expect(streams[0].stream.getAudioTracks()[0].readyState).toBe('ended')
    setSpeaking(false)
    await expect.poll(() => streams.length, {timeout: 5000}).toBe(2)
    await expect.poll(() => microphone.title).toContain('듣는 중')
    play(streams[1])
    await expect.poll(() => messages, {timeout: 10_000}).toEqual(['첫 번째 말', '두 번째 말'])
    // Escape ends continuous listening while narration owns the microphone.
    screen.getByRole('textbox').focus()
    await userEvent.keyboard('{Escape}')
    setSpeaking(false)
    expect(screen.getByRole('button', {name: '연속 대화 시작'})).toBe(microphone)
    expect(streams).toHaveLength(2)
  } finally {
    cleanup()
    streams.forEach((output) => output.stream.getTracks().forEach((track) => track.stop()))
    await context.close()
  }
}, 30_000)
