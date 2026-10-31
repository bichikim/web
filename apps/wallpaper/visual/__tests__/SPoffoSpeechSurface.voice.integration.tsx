import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {
  type CodexActivity,
  type CodexSnapshot,
  useCodexNotifications,
  useSpeechTarget,
} from '../../src/features/codex'
import {useWidgetSpeech} from '../../src/features/speech/use-widget-speech'
import {createResidentSynthesis} from '../../src/features/voice/resident-synthesis'
import {createSemanticModel} from '../../src/features/semantics/model'
import {useSemanticHost} from '../../src/features/semantics/use-semantic-host'
import {useSemanticParameters} from '../../src/features/semantics/use-semantic-parameters'
import {SPoffoSpeechSurface} from '../../src/components/SPoffoSpeechSurface'
import 'virtual:uno.css'

vi.mock('../../src/features/codex/use-codex-notifications', () => ({
  useCodexNotifications: vi.fn(),
}))
vi.mock('../../src/features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
vi.mock('../../src/features/speech/use-widget-speech', () => ({useWidgetSpeech: vi.fn()}))
vi.mock('../../src/features/voice/resident-synthesis', () => ({createResidentSynthesis: vi.fn()}))
vi.mock('../../src/features/semantics/model', () => ({createSemanticModel: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

test('should release the semantic expression when actual queued audio reaches its ended event', async () => {
  const ended = Promise.withResolvers<void>()
  const start = AudioBufferSourceNode.prototype.start
  const audio = vi
    .spyOn(AudioBufferSourceNode.prototype, 'start')
    .mockImplementation(function audio(
      this: AudioBufferSourceNode,
      ...args: Parameters<AudioBufferSourceNode['start']>
    ) {
      this.addEventListener('ended', () => ended.resolve(), {once: true})
      return start.apply(this, args)
    })
  vi.mocked(createResidentSynthesis).mockReturnValue({
    dispose: vi.fn(),
    generate: vi.fn().mockResolvedValue({sampleRate: 24_000, samples: new Float32Array(48_000)}),
  })
  vi.mocked(createSemanticModel).mockReturnValue({
    dispose: vi.fn(),
    embed: vi.fn(async (texts: readonly string[]) => texts.map(() => [1, 0])),
  })
  const speech = {
    enabled: true,
    semanticBindings: [
      {
        enabled: true,
        id: 'happy',
        mode: 'toggle' as const,
        parameterId: 'smile',
        text: '축하해요!',
        threshold: 0.84,
        to: 1,
      },
    ],
    voice: {...DEFAULT_POFFO_VOICE, enabled: true},
    x: 0.9,
    y: 0.05,
  }
  vi.mocked(useWidgetSpeech).mockReturnValue({error: () => null, speech: () => speech})
  vi.mocked(useSpeechTarget).mockReturnValue(() => undefined)
  const activity: CodexActivity = {
    notificationId: 1,
    phase: 'response',
    receivedAt: 1,
    sessionId: 'voice-chat',
    text: '잘됐어요. 축하해요!',
    title: '기쁨',
    tool: null,
  }
  const [snapshot, setSnapshot] = createSignal<CodexSnapshot>({
    activity: null,
    received: true,
    recent: [],
    registered: true,
    sessions: [],
  })
  vi.mocked(useCodexNotifications).mockReturnValue({
    available: true,
    busy: () => false,
    configureQuestions: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dismiss: undefined,
    error: () => null,
    loading: () => false,
    refresh: vi.fn(),
    snapshot,
  })
  const [smile, setSmile] = createSignal<number | null>(null)
  render(() => {
    useSemanticHost({
      widgets: () => [{assetId: 'character', id: 'voice-widget', speech, x: null, y: null}],
    })
    useSemanticParameters({
      bindings: () => speech.semanticBindings,
      parameters: () => [{defaultValue: 0, id: 'smile', maximum: 1, minimum: 0}],
      player: () => ({
        clearParameterValues: () => setSmile(null),
        patchParameterValues: (values) => setSmile(values.smile),
      }),
      widgetId: () => 'voice-widget',
    })
    const begin = () => setSnapshot((value) => ({...value, activity, sessions: [activity]}))
    return (
      <>
        <button onClick={begin}>읽기 시작</button>
        <output aria-label="표정">{smile() ?? '기본'}</output>
        <SPoffoSpeechSurface widgetId="voice-widget" />
      </>
    )
  })
  await page.getByRole('button', {name: '읽기 시작'}).click()
  await expect.poll(() => audio.mock.calls.length).toBe(1)
  await expect.poll(() => screen.getByLabelText('표정').textContent).toBe('1')
  await ended.promise
  await expect.poll(() => screen.getByLabelText('표정').textContent).toBe('기본')
  expect(screen.queryByRole('alert')).toBeNull()
})
