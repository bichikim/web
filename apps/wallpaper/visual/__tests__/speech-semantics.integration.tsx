import {afterEach, expect, test, vi} from 'vitest'
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {page} from 'vitest/browser'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {SemanticFrame, SemanticInput} from '@winter-love/wallpaper/settings/semantics'
import type {VoiceMessage} from '../../src/features/voice/text'
import {useVoice} from '../../src/features/voice/use-voice'
import {useSpeechSemantics} from '../../src/features/semantics/use-speech-semantics'
import {useSemanticHost} from '../../src/features/semantics/use-semantic-host'
import {subscribeSemanticFrame, subscribeSemanticInput} from '../../src/features/semantics/channel'
import {createSemanticModel} from '../../src/features/semantics/model'

vi.mock('../../src/features/semantics/model', () => ({createSemanticModel: vi.fn()}))
vi.mock('../../src/features/voice/synthesis', () => ({
  createSynthesis: () => ({
    dispose: vi.fn(),
    generate: async () => ({sampleRate: 16000, samples: new Float32Array(4800).fill(0.1)}),
  }),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('should keep real audio moving during delayed analysis and apply only the audible segment', async () => {
  const first = '실패해서 속상했어요. 자신감도 없었고요.'
  const second = '그래도 다시 해봤어요. 이번엔 성공했어요!'
  const third = '이제 설명을 이어갈게요.'
  const delayed = Promise.withResolvers<number[][]>()
  const embed = vi
    .fn(async (texts: readonly string[]) =>
      texts.map((text) => (text.endsWith(second) || text.endsWith('happy') ? [1, 0] : [0, 1])),
    )
    .mockImplementationOnce(() => delayed.promise)
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const inputs: SemanticInput[] = []
  const frames: SemanticFrame[] = []
  const stopInput = await subscribeSemanticInput((input) => inputs.push(input))
  const stopFrame = await subscribeSemanticFrame((frame) => frames.push(frame))
  const widget: PoffoWidget = {
    assetId: 'ash',
    id: 'speech-segments',
    speech: {
      enabled: true,
      semanticBindings: [
        {
          action: {id: 'smile', kind: 'expression'},
          enabled: true,
          id: 'happy',
          mode: 'toggle',
          parameterId: null,
          text: 'happy',
          threshold: 0.8,
        },
      ],
      voice: {...DEFAULT_POFFO_VOICE, volume: 0},
      x: 0,
      y: 0,
    },
    x: null,
    y: null,
  }
  let score: () => number | undefined = () => undefined
  try {
    render(() => {
      const [message, setMessage] = createSignal<VoiceMessage | null>(null)
      const voice = useVoice({message, speech: () => widget.speech!})
      const host = useSemanticHost({widgets: () => [widget]})
      score = () => host.score(widget.id, 'happy')
      useSpeechSemantics({
        enabled: () => true,
        message,
        playback: voice.playback,
        status: voice.status,
        voiceEnabled: () => true,
        widgetId: () => widget.id,
      })
      const start = () =>
        setMessage({chat: 'chat', id: 'reply', text: [first, second, third].join('\n\n')})
      return <button onClick={start}>Start narration</button>
    })
    await page.getByRole('button', {name: 'Start narration'}).click()
    await expect
      .poll(() =>
        inputs.some((input) => input.narration?.phase === 'playing' && input.text === second),
      )
      .toBe(true)
    expect(embed).toHaveBeenCalledOnce()
    expect(score()).toBeUndefined()
    delayed.resolve([
      [0, 1],
      [1, 0],
    ])
    await expect.poll(score).toBe(1)
    await expect
      .poll(() =>
        inputs.some((input) => input.narration?.phase === 'playing' && input.text === third),
      )
      .toBe(true)
    await expect.poll(score).toBe(0)
    expect(embed).toHaveBeenCalledTimes(3)
    expect(
      frames
        .filter((frame) => frame.scores.happy === 1)
        .every((frame) => frame.narration?.phase === 'playing'),
    ).toBe(true)
    await expect.poll(() => inputs.at(-1)?.narration?.phase).toBe('ended')
  } finally {
    delayed.resolve([
      [0, 1],
      [1, 0],
    ])
    stopInput()
    stopFrame()
  }
})
