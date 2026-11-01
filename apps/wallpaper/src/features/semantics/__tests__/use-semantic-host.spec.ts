/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {waitFor} from '@solidjs/testing-library'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {useSemanticInput} from '../use-semantic-input'
import {afterEach, expect, it, vi} from 'vitest'
import {createSemanticModel} from '../model'
import {
  requestSemanticFrame,
  sendSemanticInput,
  subscribeSemanticFrame,
  subscribeSemanticInput,
} from '../channel'
import type {SemanticFrame} from '@winter-love/wallpaper/settings/semantics'
import {useSemanticHost} from '../use-semantic-host'

vi.mock('../model', () => ({createSemanticModel: vi.fn()}))
afterEach(() => vi.resetAllMocks())
it('should retain manual previews during analysis, replay them and clear invalid selections', async () => {
  const embed = vi.fn(async (texts: readonly string[]) => texts.map(() => [1, 0]))
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const [widgets, setWidgets] = createStore<PoffoWidget[]>([
    {
      assetId: 'character',
      id: 'preview-widget',
      speech: {
        enabled: true,
        semanticBindings: [
          {
            action: {id: 'smile', kind: 'expression'},
            enabled: true,
            id: 'happy',
            mode: 'toggle',
            parameterId: null,
            text: '기쁨',
            threshold: 0.75,
          },
        ],
        x: 0.9,
        y: 0.05,
      },
      x: null,
      y: null,
    },
  ])
  const frames: SemanticFrame[] = []
  const stop = await subscribeSemanticFrame((frame) => frames.push(frame))
  const scope = createRoot((cleanup) => ({
    cleanup,
    host: useSemanticHost({widgets: () => widgets}),
  }))
  try {
    scope.host.preview('preview-widget', 'happy')
    expect(scope.host.previewing('preview-widget', 'happy')).toBe(true)
    expect(frames.at(-1)?.previewId).toBe('happy')
    expect(embed).not.toHaveBeenCalled()
    scope.host.test('preview-widget', '기뻐요')
    await waitFor(() => expect(scope.host.score('preview-widget', 'happy')).toBe(1), {
      interval: 1,
      timeout: 100,
    })
    expect(frames.at(-1)?.previewId).toBe('happy')
    await requestSemanticFrame('preview-widget')
    expect(frames.at(-1)?.previewId).toBe('happy')
    scope.host.preview('preview-widget', null)
    expect(frames.at(-1)).toEqual({scores: {happy: 1}, widgetId: 'preview-widget'})
    scope.host.preview('preview-widget', 'happy')
    setWidgets(
      reconcile(
        widgets.map((widget) => ({
          ...widget,
          speech: {
            ...widget.speech!,
            semanticBindings: widget.speech!.semanticBindings!.map((binding) => ({
              ...binding,
              enabled: false,
            })),
          },
        })),
      ),
    )
    expect(scope.host.previewing('preview-widget', 'happy')).toBe(false)
    expect(frames.at(-1)?.previewId).toBeUndefined()
    scope.host.preview('missing-widget', 'happy')
    scope.host.preview('preview-widget', 'missing-binding')
    expect(scope.host.previewing('preview-widget', 'missing-binding')).toBe(false)
  } finally {
    scope.cleanup()
    stop()
  }
})
it('should discard obsolete model results and apply only the latest pending text', async () => {
  const started = Promise.withResolvers<void>()
  const first = Promise.withResolvers<number[][]>()
  const latest = Promise.withResolvers<void>()
  const embed = vi
    .fn()
    .mockImplementationOnce(() => {
      started.resolve()
      return first.promise
    })
    .mockResolvedValue([
      [1, 0],
      [0, 1],
    ])
  const dispose = vi.fn()
  vi.mocked(createSemanticModel).mockReturnValue({dispose, embed})
  const seen: number[] = []
  const stop = await subscribeSemanticFrame((frame) => {
    if (frame.scores.happy !== undefined) {
      seen.push(frame.scores.happy)
      latest.resolve()
    }
  })
  const scope = createRoot((cleanup) => ({
    cleanup,
    host: useSemanticHost({
      widgets: () => [
        {
          assetId: 'character',
          id: 'widget',
          speech: {
            enabled: true,
            semanticBindings: [
              {
                action: {id: 'smile', kind: 'expression'},
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: null,
                text: '기쁨',
                threshold: 0.75,
              },
            ],
            x: 0.9,
            y: 0.05,
          },
          x: null,
          y: null,
        },
      ],
    }),
  }))
  try {
    scope.host.test('widget', '먼저 들어온 문장')
    await started.promise
    scope.host.test('widget', '나중에 바뀐 문장')
    first.resolve([
      [1, 0],
      [1, 0],
    ])
    await latest.promise
    expect(seen).toEqual([0])
    expect(embed).toHaveBeenCalledTimes(2)
    expect(scope.host.score('widget', 'happy')).toBe(0)
  } finally {
    scope.cleanup()
    stop()
  }
  expect(dispose).toHaveBeenCalledOnce()
})
it('should clear active matches and show a model failure without fabricating a score', async () => {
  const cleared = Promise.withResolvers<void>()
  const embed = vi.fn().mockRejectedValue(new Error('asset unavailable'))
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const scope = createRoot((cleanup) => ({
    cleanup,
    host: useSemanticHost({
      widgets: () => [
        {
          assetId: 'character',
          id: 'widget',
          speech: {
            enabled: true,
            semanticBindings: [
              {
                action: {id: 'smile', kind: 'expression'},
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: null,
                text: '기쁨',
                threshold: 0.75,
              },
            ],
            x: 0.9,
            y: 0.05,
          },
          x: null,
          y: null,
        },
      ],
    }),
  }))
  const stop = await subscribeSemanticFrame((frame) => {
    if (scope.host.error() !== null && Object.keys(frame.scores).length === 0) {
      cleared.resolve()
    }
  })
  try {
    scope.host.test('widget', '테스트 문장')
    await cleared.promise
    expect(scope.host.error()).toBe('로컬 텍스트 분석을 실행하지 못했어요.')
    expect(scope.host.score('widget', 'happy')).toBeUndefined()
  } finally {
    scope.cleanup()
    stop()
  }
})

it('should recover bubble input after store hydration and react to in-place connection edits', async () => {
  const embed = vi.fn(async (texts: readonly string[]) =>
    texts.map((text) => (text.includes('슬픔') ? [0, 1] : [1, 0])),
  )
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const inputs: string[] = []
  const stop = await subscribeSemanticInput((input) => {
    if (input.widgetId === 'hydrated-widget') {
      inputs.push(input.text)
    }
  })
  const [widgets, setWidgets] = createStore<PoffoWidget[]>([])
  const scope = createRoot((cleanup) => {
    const host = useSemanticHost({widgets: () => widgets})
    useSemanticInput({text: () => '기쁘고 행복해!', widgetId: () => 'hydrated-widget'})
    return {cleanup, host}
  })
  try {
    await waitFor(() => expect(inputs.length).toBeGreaterThanOrEqual(2), {
      interval: 1,
      timeout: 100,
    })
    setWidgets(
      reconcile([
        {
          assetId: 'character',
          id: 'hydrated-widget',
          speech: {
            enabled: true,
            semanticBindings: [
              {
                action: {id: 'smile', kind: 'expression'},
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: null,
                text: '기쁨',
                threshold: 0.75,
              },
            ],
            x: 0.9,
            y: 0.05,
          },
          x: null,
          y: null,
        },
      ]),
    )
    await waitFor(() => expect(scope.host.score('hydrated-widget', 'happy')).toBe(1), {
      interval: 1,
      timeout: 100,
    })
    setWidgets(
      reconcile([
        {
          ...widgets[0],
          speech: {
            ...widgets[0].speech!,
            semanticBindings: [{...widgets[0].speech!.semanticBindings![0], text: '슬픔'}],
          },
        },
      ]),
    )
    await waitFor(() => expect(scope.host.score('hydrated-widget', 'happy')).toBe(0), {
      interval: 1,
      timeout: 100,
    })
    expect(embed).toHaveBeenCalledTimes(2)
  } finally {
    scope.cleanup()
    stop()
  }
})

it('should clear expressions immediately at speech end and discard analysis still in flight', async () => {
  const analysis = Promise.withResolvers<ReadonlyArray<readonly number[]>>()
  const embed = vi
    .fn()
    .mockResolvedValueOnce([
      [1, 0],
      [1, 0],
    ])
    .mockReturnValueOnce(analysis.promise)
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const scope = createRoot((cleanup) => ({
    cleanup,
    host: useSemanticHost({
      widgets: () => [
        {
          assetId: 'character',
          id: 'widget',
          speech: {
            enabled: true,
            semanticBindings: [
              {
                action: {id: 'smile', kind: 'expression'},
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: null,
                text: '기쁨',
                threshold: 0.75,
              },
            ],
            x: 0.9,
            y: 0.05,
          },
          x: null,
          y: null,
        },
      ],
    }),
  }))
  try {
    scope.host.test('widget', '기뻐요')
    await waitFor(() => expect(scope.host.score('widget', 'happy')).toBe(1), {
      interval: 1,
      timeout: 100,
    })
    scope.host.test('widget', '정말 행복해요')
    await waitFor(() => expect(embed).toHaveBeenCalledTimes(2), {interval: 1, timeout: 100})
    scope.host.test('widget', '')
    expect(scope.host.score('widget', 'happy')).toBeUndefined()
    analysis.resolve([
      [1, 0],
      [1, 0],
    ])
    await analysis.promise
    expect(scope.host.score('widget', 'happy')).toBeUndefined()
  } finally {
    scope.cleanup()
  }
})

it('should publish fallback only for an unmatched playing narration and clear it at voice end', async () => {
  const embed = vi.fn(async (texts: readonly string[]) =>
    texts.map((text) => (text.endsWith('행복') ? [1, 0] : [0, 1])),
  )
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const frames: SemanticFrame[] = []
  const stop = await subscribeSemanticFrame((frame) => frames.push(frame))
  const random = vi.spyOn(Math, 'random').mockReturnValue(0)
  const dispose = createRoot((cleanup) => {
    useSemanticHost({
      widgets: () => [
        {
          assetId: 'builtin:ash',
          id: 'random-widget',
          speech: {
            enabled: true,
            randomActions: {bindingIds: ['note'], enabled: true, probability: 1},
            semanticBindings: [
              {
                action: {id: 'notes', kind: 'expression'},
                category: 'behavior',
                enabled: true,
                id: 'note',
                mode: 'toggle',
                parameterId: null,
                text: '행복',
                threshold: 0.8,
              },
            ],
            x: 0.9,
            y: 0.05,
          },
          x: null,
          y: null,
        },
      ],
    })
    return cleanup
  })
  try {
    await sendSemanticInput({text: '일반 문장', widgetId: 'random-widget'})
    await waitFor(() => expect(frames.at(-1)?.scores.note).toBe(0), {interval: 1})
    expect(frames.at(-1)?.fallbackId).toBeUndefined()
    await sendSemanticInput({readoutId: 'voice-1', text: '일반 문장', widgetId: 'random-widget'})
    await waitFor(() => expect(frames.at(-1)?.fallbackId).toBe('note'), {interval: 1})
    const draws = random.mock.calls.length
    await sendSemanticInput({
      readoutId: 'voice-1',
      text: '다른 일반 문장',
      widgetId: 'random-widget',
    })
    await waitFor(() => expect(embed).toHaveBeenCalledTimes(3), {interval: 1})
    expect(random).toHaveBeenCalledTimes(draws)
    await sendSemanticInput({text: '', widgetId: 'random-widget'})
    expect(frames.at(-1)?.fallbackId).toBeUndefined()
  } finally {
    dispose()
    stop()
    random.mockRestore()
  }
})

it('should retain actions through preparation, clear at next playback and reject late results', async () => {
  const next = Promise.withResolvers<number[][]>()
  const embed = vi
    .fn(async (texts: readonly string[]) => texts.map(() => [1, 0]))
    .mockImplementationOnce(async (texts) => texts.map(() => [1, 0]))
    .mockImplementationOnce(() => next.promise)
  vi.mocked(createSemanticModel).mockReturnValue({dispose: vi.fn(), embed})
  const frames: SemanticFrame[] = []
  const stop = await subscribeSemanticFrame((frame) => frames.push(frame))
  const scope = createRoot((cleanup) => {
    const host = useSemanticHost({
      widgets: () => [
        {
          assetId: 'character',
          id: 'held-widget',
          speech: {
            enabled: true,
            semanticBindings: [
              {
                action: {id: 'notes', kind: 'expression'},
                enabled: true,
                id: 'notes',
                mode: 'toggle',
                parameterId: null,
                release: 'next-speech',
                text: '기록',
                threshold: 0.8,
              },
            ],
            x: 0.9,
            y: 0.05,
          },
          x: null,
          y: null,
        },
      ],
    })
    return {dispose: cleanup, host}
  })
  try {
    await sendSemanticInput({
      narration: {phase: 'playing', readoutId: 'first'},
      text: '작성했어요',
      widgetId: 'held-widget',
    })
    await waitFor(() => expect(frames.at(-1)?.scores.notes).toBe(1), {interval: 1, timeout: 100})
    await sendSemanticInput({narration: {phase: 'ended'}, text: '', widgetId: 'held-widget'})
    expect(frames.at(-1)).toMatchObject({narration: {phase: 'ended'}, scores: {notes: 1}})
    await sendSemanticInput({
      narration: {phase: 'waiting'},
      text: '다음 음성을 준비해요',
      widgetId: 'held-widget',
    })
    expect(frames.at(-1)?.scores.notes).toBe(1)
    expect(embed).toHaveBeenCalledOnce()
    await sendSemanticInput({
      narration: {phase: 'playing', readoutId: 'second'},
      text: '다음 음성이에요',
      widgetId: 'held-widget',
    })
    expect(frames.at(-1)).toMatchObject({
      narration: {phase: 'playing', readoutId: 'second'},
      scores: {},
    })
    await waitFor(() => expect(embed).toHaveBeenCalledTimes(2), {interval: 1, timeout: 100})
    await sendSemanticInput({narration: {phase: 'ended'}, text: '', widgetId: 'held-widget'})
    next.resolve([
      [1, 0],
      [1, 0],
    ])
    await next.promise
    await waitFor(() => expect(scope.host.busy()).toBe(false), {interval: 1, timeout: 100})
    expect(frames.at(-1)).toMatchObject({narration: {phase: 'ended'}, scores: {}})
    await sendSemanticInput({text: '', widgetId: 'held-widget'})
    expect(frames.at(-1)).toEqual({scores: {}, widgetId: 'held-widget'})
  } finally {
    scope.dispose()
    stop()
  }
})
