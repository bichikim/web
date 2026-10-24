/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import {registerPSayTool} from '../register-pomo-say-tool'

interface CapturedTool {
  readonly annotations?: {readonly readOnlyHint?: boolean}
  readonly execute: (input: unknown) => Promise<unknown>
  readonly inputSchema: object
  readonly name: string
  readonly title: string
}

const createRegisterTool = () =>
  vi.fn(async (_tool: CapturedTool, _options?: {readonly signal?: AbortSignal}) => undefined)

it.each([undefined, null, 'invalid', {}, {registerTool: 'invalid'}])(
  'should skip the unsupported model context %s',
  async (modelContext) => {
    const testDocument = {modelContext} as unknown as Document

    await expect(registerPSayTool({document: testDocument, speak: vi.fn()})).resolves.toBe(false)
  },
)

it('should register and execute the Pomo speech tool', async () => {
  const registerTool = createRegisterTool()
  const speak = vi.fn(async () => undefined)
  const signal = new AbortController().signal
  const testDocument = {modelContext: {registerTool}} as unknown as Document

  await expect(registerPSayTool({document: testDocument, signal, speak})).resolves.toBe(true)
  const tool = registerTool.mock.calls[0]![0]
  expect(registerTool.mock.calls[0]![1]).toEqual({signal})
  expect(tool).toMatchObject({
    annotations: {readOnlyHint: false},
    name: 'pomo_say',
    title: 'Pomo가 말하기',
  })
  expect(tool.inputSchema).toEqual(expect.objectContaining({required: ['text'], type: 'object'}))

  await expect(tool.execute({text: '  안녕하세요  '})).resolves.toEqual({
    spoken: true,
    voice: 'Yuna',
  })
  expect(speak).toHaveBeenNthCalledWith(1, {text: '안녕하세요'})
  await expect(tool.execute({text: '말해 줘', voice: 'Hana'})).resolves.toEqual({
    spoken: true,
    voice: 'Hana',
  })
  expect(speak).toHaveBeenNthCalledWith(2, {text: '말해 줘', voiceId: 'Hana'})
})

it.each([
  [null, TypeError],
  [{}, TypeError],
  [{text: 1}, TypeError],
  [{text: '   '}, RangeError],
  [{text: '가'.repeat(3001)}, RangeError],
  [{text: '말해 줘', voice: 1}, TypeError],
  [{text: '말해 줘', voice: 'Unknown'}, TypeError],
] as const)('should reject invalid speech input', async (input, ErrorType) => {
  const registerTool = createRegisterTool()
  await registerPSayTool({
    document: {modelContext: {registerTool}} as unknown as Document,
    speak: vi.fn(),
  })

  await expect(registerTool.mock.calls[0]![0].execute(input)).rejects.toBeInstanceOf(ErrorType)
})
