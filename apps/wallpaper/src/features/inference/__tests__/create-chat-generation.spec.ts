// oxlint-disable eslint-js/camelcase -- Transformers.js options use upstream names.
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {env, Gemma4ForCausalLM, Gemma4Processor, TextStreamer} from '@huggingface/transformers'
import {createChatGeneration} from '../create-chat-generation'

vi.mock('@huggingface/transformers', () => ({
  env: {},
  Gemma4ForCausalLM: {from_pretrained: vi.fn()},
  Gemma4Processor: {from_pretrained: vi.fn()},
  TextStreamer: vi.fn(),
}))
beforeEach(() => {
  vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn().mockResolvedValue({})}})
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

const fixture = () => {
  const tokenizer = vi.fn()
  const processor = Object.assign(vi.fn().mockResolvedValue({input_ids: 'tokens'}), {
    apply_chat_template: vi.fn().mockReturnValue('Gemma prompt'),
    tokenizer,
  })
  const generate = vi.fn().mockImplementation(async () => {
    const options = vi.mocked(TextStreamer).mock.calls.at(-1)![1]
    options?.callback_function?.('안녕! ')
    options?.callback_function?.('반가워.')
  })
  vi.mocked(Gemma4Processor.from_pretrained).mockResolvedValue(
    processor as unknown as Awaited<ReturnType<typeof Gemma4Processor.from_pretrained>>,
  )
  vi.mocked(Gemma4ForCausalLM.from_pretrained).mockResolvedValue({generate} as unknown as Awaited<
    ReturnType<typeof Gemma4ForCausalLM.from_pretrained>
  >)
  return {generate, processor, tokenizer}
}

it('should load Pomofi Gemma 4 Q4 at its pinned revision and reuse it for later conversation turns', async () => {
  const fetchAsset = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchAsset)
  const test = fixture()
  const chat = createChatGeneration('/shared/')
  const messages = [{content: '안녕', role: 'user'}] as const
  const status = vi.fn()
  await expect(chat.generate({messages, type: 'chat'}, status)).resolves.toBe('안녕! 반가워.')
  await chat.generate({messages, type: 'chat'}, status)
  const repository = 'onnx-community/gemma-4-E2B-it-ONNX'
  const revision = '9f4bef82ea6e296bc69f8a2f5939f73af81b07a6'
  expect(Gemma4Processor.from_pretrained).toHaveBeenCalledExactlyOnceWith(repository, {
    local_files_only: true,
    revision,
  })
  expect(Gemma4ForCausalLM.from_pretrained).toHaveBeenCalledExactlyOnceWith(repository, {
    device: 'webgpu',
    dtype: {decoder_model_merged: 'q4', embed_tokens: 'q4'},
    local_files_only: true,
    progress_callback: expect.any(Function),
    revision,
  })
  expect(env.allowRemoteModels).toBe(false)
  expect(env.useBrowserCache).toBe(false)
  await env.fetch(`/conversation-models/${repository}/config.json`)
  expect(fetchAsset).toHaveBeenCalledWith(`/shared/${repository}/config.json`, {cache: 'no-store'})
  expect(() => env.fetch('https://remote.invalid/model.onnx')).toThrow()
  expect(test.processor.apply_chat_template).toHaveBeenCalledWith(
    [{content: expect.any(String), role: 'system'}, ...messages],
    {add_generation_prompt: true, enable_thinking: false, tokenize: false},
  )
  expect(test.processor).toHaveBeenCalledWith('Gemma prompt')
  expect(TextStreamer).toHaveBeenCalledWith(
    test.tokenizer,
    expect.objectContaining({skip_prompt: true}),
  )
  expect(test.generate).toHaveBeenCalledWith(
    expect.objectContaining({input_ids: 'tokens', max_new_tokens: 192}),
  )
  expect(status).toHaveBeenLastCalledWith('답변 생성 중')
})

it('should report that WebGPU is required before downloading any model when no adapter is available', async () => {
  fixture()
  vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn().mockResolvedValue(null)}})
  const chat = createChatGeneration('/shared/')
  await expect(chat.generate({messages: [], type: 'chat'})).rejects.toThrow('WebGPU')
  expect(Gemma4ForCausalLM.from_pretrained).not.toHaveBeenCalled()
  expect(Gemma4Processor.from_pretrained).not.toHaveBeenCalled()
})

it('should allow a fresh model preparation after a failed download', async () => {
  fixture()
  vi.mocked(Gemma4Processor.from_pretrained).mockRejectedValueOnce(new Error('download failed'))
  const chat = createChatGeneration('/shared/')
  await expect(chat.generate({messages: [], type: 'chat'})).rejects.toThrow('download failed')
  await expect(chat.generate({messages: [], type: 'chat'})).resolves.toBe('안녕! 반가워.')
  expect(Gemma4Processor.from_pretrained).toHaveBeenCalledTimes(2)
})

it('should reject empty model output', async () => {
  const test = fixture()
  test.generate.mockResolvedValue(undefined)
  const chat = createChatGeneration('/shared/')
  await expect(chat.generate({messages: [], type: 'chat'})).rejects.toThrow(
    '답변을 만들지 못했어요',
  )
})

it('should reject an incomplete processor before loading the model weights', async () => {
  const test = fixture()
  Reflect.deleteProperty(test.processor, 'tokenizer')
  const chat = createChatGeneration('/shared/')
  await expect(chat.generate({messages: [], type: 'chat'})).rejects.toThrow('토크나이저')
  expect(Gemma4ForCausalLM.from_pretrained).not.toHaveBeenCalled()
})
