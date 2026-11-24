import {expect, it, vi} from 'vitest'
import {classifySemantics} from '../classify'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
const binding: SemanticBinding = {
  action: {id: 'smile', kind: 'expression'},
  enabled: true,
  id: 'happy',
  mode: 'toggle',
  parameterId: null,
  text: '기쁨',
  threshold: 0.75,
}
it('should embed text and active user descriptions with the same classification task', async () => {
  const embed = vi.fn().mockResolvedValue([
    [1, 0],
    [0.8, 0.6],
  ])
  expect(
    await classifySemantics({
      bindings: [binding, {...binding, enabled: false, id: 'off'}],
      embed,
      text: '해결했어!',
    }),
  ).toEqual({happy: 0.8})
  expect(embed).toHaveBeenCalledExactlyOnceWith([
    'task: classification | query: 해결했어!',
    'task: classification | query: 기쁨',
  ])
})
it('should avoid loading the model for empty text or incomplete connections', async () => {
  const embed = vi.fn()
  expect(await classifySemantics({bindings: [binding], embed, text: ''})).toEqual({})
  expect(
    await classifySemantics({
      bindings: [{...binding, action: undefined, parameterId: null}],
      embed,
      text: '안녕',
    }),
  ).toEqual({})
  expect(embed).not.toHaveBeenCalled()
})
it('should match conversational examples separately so a long answer does not dilute an action', async () => {
  const vectors: Readonly<Record<string, readonly number[]>> = {
    'task: classification | query: 문서에 기록했어요.': [1, 0],
    'task: classification | query: 요약해 두었어요.': [0.8, 0.6],
    'task: classification | query: 정리해서 작성했어요.': [1, 0],
    'task: classification | query: 확인 결과입니다.': [0, 1],
  }
  const embed = vi.fn(async (texts: readonly string[]) => texts.map((text) => vectors[text]))
  expect(
    await classifySemantics({
      bindings: [{...binding, text: '문서에 기록했어요.\n요약해 두었어요.'}],
      embed,
      text: '확인 결과입니다.\n\n정리해서 작성했어요.',
    }),
  ).toEqual({happy: 1})
  expect(embed).toHaveBeenCalledExactlyOnceWith([
    'task: classification | query: 확인 결과입니다.',
    'task: classification | query: 정리해서 작성했어요.',
    'task: classification | query: 문서에 기록했어요.',
    'task: classification | query: 요약해 두었어요.',
  ])
})
it('should reject invalid model output instead of publishing a fabricated match', async () => {
  const embed = vi.fn().mockResolvedValue([
    [1, 0],
    [Number.NaN, 0],
  ])
  await expect(classifySemantics({bindings: [binding], embed, text: '안녕'})).rejects.toThrow(
    'invalid embeddings',
  )
})
it.each([
  {expected: -1, text: '슬프지만 울지 않았어요.'},
  {expected: 1, text: '결국 울음이 터졌어요.'},
  {expected: 1, text: '슬프지만 울지 않았어요.\n결국 울음이 터졌어요.'},
])('should compare exclusions per paragraph for "$text"', async ({expected, text}) => {
  const positive = [0.9, Math.sqrt(0.19)]
  const vectors: Readonly<Record<string, readonly number[]>> = {
    'task: classification | query: 결국 울음이 터졌어요.': positive,
    'task: classification | query: 슬프지만 울지 않았어요.': [1, 0],
    'task: classification | query: 울음을 쏟았어요.': positive,
    'task: classification | query: 울지 않았어요.': [1, 0],
  }
  const embed = vi.fn(async (texts: readonly string[]) => texts.map((value) => vectors[value]))
  expect(
    await classifySemantics({
      bindings: [{...binding, excludeText: '울지 않았어요.', text: '울음을 쏟았어요.'}],
      embed,
      text,
    }),
  ).toEqual({happy: expected})
})
it('should reject an exclusion tie even when the matching threshold is zero', async () => {
  const scores = await classifySemantics({
    bindings: [{...binding, excludeText: binding.text, threshold: 0}],
    embed: async (texts) => texts.map(() => [1, 0]),
    text: '기쁜 문장',
  })
  expect(scores.happy).toBeLessThan(0)
})

it('should analyze a bundle once and ignore an explicitly cleared legacy connection', async () => {
  const embed = vi.fn(async (texts: readonly string[]) => texts.map(() => [1, 0]))
  const result = await classifySemantics({
    bindings: [
      {
        ...binding,
        action: undefined,
        actions: [
          {id: 'notes', kind: 'expression'},
          {id: 'Walk:0', kind: 'motion'},
        ],
      },
      {...binding, actions: [], id: 'cleared'},
    ],
    embed,
    text: '기뻐요',
  })
  expect(result).toEqual({happy: 1})
  expect(embed).toHaveBeenCalledExactlyOnceWith([
    'task: classification | query: 기뻐요',
    'task: classification | query: 기쁨',
  ])
})

it('should avoid embedding menu-only descriptions', async () => {
  const embed = vi.fn()
  expect(
    await classifySemantics({
      bindings: [{...binding, category: 'menu', menuActive: true}],
      embed,
      text: '기뻐요',
    }),
  ).toEqual({})
  expect(embed).not.toHaveBeenCalled()
})

it.each(['Korean', 'English'])(
  'should retain both full language sets when matching %s input',
  async (language) => {
    const english = Array.from({length: 8}, (_, index) => `English ${index}`)
    const korean = Array.from({length: 8}, (_, index) => `한국어 ${index}`)
    const target = language === 'Korean' ? korean[0] : english[0]
    const result = await classifySemantics({
      bindings: [
        {
          ...binding,
          examples: [
            {language: 'en', text: english.join('\n')},
            {language: 'ko', text: korean.join('\n')},
          ],
          text: english.join('\n'),
        },
      ],
      embed: async (texts) =>
        texts.map((text) => (text.endsWith(target) || text.endsWith('Input') ? [1, 0] : [0, 1])),
      text: 'Input',
    })
    expect(result.happy).toBe(1)
  },
)

it('should veto a match when an exclusion in either language is closer', async () => {
  const result = await classifySemantics({
    bindings: [
      {
        ...binding,
        examples: [
          {excludeText: 'I did not cry.', language: 'en', text: 'I cried.'},
          {excludeText: '울지 않았어요.', language: 'ko', text: '울었어요.'},
        ],
      },
    ],
    embed: async (texts) =>
      texts.map((text) =>
        text.endsWith('울지 않았어요.')
          ? [1, 0]
          : text.endsWith('I did not cry.')
            ? [0, 1]
            : [0.8, 0.6],
      ),
    text: '울지 않았어요.',
  })
  expect(result.happy).toBe(-1)
})

it('should match all saved languages even when the first language is blank', async () => {
  const result = await classifySemantics({
    bindings: [
      {
        ...binding,
        examples: [
          {language: 'en', text: ''},
          {language: 'ja', text: 'うれしいです'},
        ],
        text: '',
      },
    ],
    embed: async (texts) => texts.map(() => [1, 0]),
    text: 'うれしいです',
  })
  expect(result.happy).toBe(1)
})
it('should honor an explicit empty language list without reviving legacy text', async () => {
  const embed = vi.fn()
  expect(
    await classifySemantics({bindings: [{...binding, examples: []}], embed, text: 'Hello'}),
  ).toEqual({})
  expect(embed).not.toHaveBeenCalled()
})
