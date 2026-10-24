import {Laya} from '@receptron/laya'
import {afterEach, expect, it, vi} from 'vitest'
import {createOnnxProviderFactory} from '../onnx-provider'

vi.mock('@receptron/laya', () => ({
  Laya: {load: vi.fn()},
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should adapt ONNX Laya to typed decisions without Python', async () => {
  const close = vi.fn(async () => undefined)
  const systemOne = vi.fn(async () => ({
    answers: {violation: {noul: 0.87, rl_agent: {act_probability: 1}, type: 'noul'}},
    model: 'fixture',
    usage: {input_tokens: 1, output_tokens: 1},
  }))
  vi.mocked(Laya.load).mockResolvedValue({close, systemOne} as never)
  const factory = createOnnxProviderFactory({
    cacheDir: '/models/cache',
    modelDir: undefined,
    modelRevision: 'revision',
    repo: 'receptron/laya-onnx',
    subfolder: 'multilingual',
  })
  const provider = await factory.create()

  await expect(
    provider.decide({
      questions: {violation: {instruction: 'Can the filename be shorter?', type: 'noul'}},
      ruleId: 'filename',
      state: {fileName: 'authenticated-user-profile-form'},
    }),
  ).resolves.toEqual({violation: {probability: 0.87, type: 'noul'}})
  expect(Laya.load).toHaveBeenCalledWith({
    cacheDir: '/models/cache',
    repo: 'receptron/laya-onnx',
    revision: 'revision',
    subfolder: 'multilingual',
  })
  expect(systemOne).toHaveBeenCalledWith(
    {fileName: 'authenticated-user-profile-form'},
    {
      violation: {
        instructions: 'Can the filename be shorter?',
        type: 'noul',
      },
    },
  )
  await provider.close()
  expect(close).toHaveBeenCalledOnce()
})

it('should load a prepared local ONNX bundle without download options', async () => {
  vi.mocked(Laya.load).mockResolvedValue({
    async close() {},
    async systemOne() {
      return {answers: {violation: {noul: 0.1}}}
    },
  } as never)
  const provider = await createOnnxProviderFactory({
    cacheDir: '/ignored',
    modelDir: '/models/laya',
    modelRevision: 'local-v1',
    repo: 'ignored/repo',
    subfolder: 'ignored',
  }).create()

  await provider.close()

  expect(Laya.load).toHaveBeenCalledWith({modelDir: '/models/laya'})
})

it('should return domain answers for batched typed questions', async () => {
  const systemOne = vi.fn(async () => ({
    answers: {
      aliasesActual: {noul: 0.93, rl_agent: {act_probability: 1}, type: 'noul'},
      relationship: {
        choice: 'dependent',
        confidence: 0.88,
        probabilities: {dependent: 0.88, independent: 0.08, unknown: 0.04},
        rl_agent: {act_probability: 1},
        type: 'choice',
      },
    },
    model: 'fixture',
    usage: {input_tokens: 1, output_tokens: 1},
  }))
  vi.mocked(Laya.load).mockResolvedValue({async close() {}, systemOne} as never)
  const provider = await createOnnxProviderFactory({
    cacheDir: undefined,
    modelDir: '/models/laya',
    modelRevision: 'local-v1',
    repo: 'ignored/repo',
    subfolder: 'ignored',
  }).create()
  const questions = {
    aliasesActual: {instruction: 'Does expected alias actual?', type: 'noul' as const},
    relationship: {
      criteria: ['dependent', 'independent', 'unknown'],
      instruction: 'How are the values related?',
      type: 'choice' as const,
    },
  }

  await expect(
    provider.decide?.({
      questions,
      ruleId: 'test-oracle',
      state: {actual: 'call()', expected: 'actual'},
    }),
  ).resolves.toEqual({
    aliasesActual: {probability: 0.93, type: 'noul'},
    relationship: {
      choice: 'dependent',
      confidence: 0.88,
      probabilities: {dependent: 0.88, independent: 0.08, unknown: 0.04},
      type: 'choice',
    },
  })
  expect(systemOne).toHaveBeenCalledWith(
    {actual: 'call()', expected: 'actual'},
    {
      aliasesActual: {instructions: 'Does expected alias actual?', type: 'noul'},
      relationship: {
        criteria: ['dependent', 'independent', 'unknown'],
        instructions: 'How are the values related?',
        type: 'choice',
      },
    },
  )
})
