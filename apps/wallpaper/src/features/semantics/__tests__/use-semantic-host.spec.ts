/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {waitFor} from '@solidjs/testing-library'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {useSemanticInput} from '../use-semantic-input'
import {afterEach, expect, it, vi} from 'vitest'
import {createSemanticModel} from '../model'
import {subscribeSemanticFrame, subscribeSemanticInput} from '../channel'
import {useSemanticHost} from '../use-semantic-host'

vi.mock('../model', () => ({createSemanticModel: vi.fn()}))
afterEach(() => vi.resetAllMocks())
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
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: 'smile',
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
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: 'smile',
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
                enabled: true,
                id: 'happy',
                mode: 'toggle',
                parameterId: 'smile',
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
