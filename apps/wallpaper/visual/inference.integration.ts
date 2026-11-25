import {expect, it, onTestFinished} from 'vitest'
import {createLocalInference} from '../src/features/inference/create-local-inference'

const MODEL_TIMEOUT = 600_000

it(
  'should generate successive Korean replies using the actual local Gemma worker',
  async () => {
    const controller = new AbortController()
    const model = createLocalInference()
    onTestFinished(() => {
      controller.abort()
      model.dispose()
    })
    const reportStatus = (text: string) => {
      if (!text.includes('%') || /(?:0|100)%$/u.test(text)) {
        console.info(text)
      }
    }
    const first = await model.run(
      {messages: [{content: '안녕! 한국어로 짧게 인사해 줘.', role: 'user'}], type: 'chat'},
      controller.signal,
      reportStatus,
    )
    expect(first).toMatch(/[가-힣]/u)
    console.info(JSON.stringify({first}))
    const second = await model.run(
      {
        messages: [
          {content: '안녕! 한국어로 짧게 인사해 줘.', role: 'user'},
          {content: first, role: 'assistant'},
          {content: '오늘은 잠깐 산책하려고 해. 짧게 한마디 해 줘.', role: 'user'},
        ],
        type: 'chat',
      },
      controller.signal,
      reportStatus,
    )
    expect(second).toMatch(/[가-힣]/u)
    console.info(JSON.stringify({second}))
    const cache = await caches.open('transformers-cache')
    const files = (await cache.keys()).map((request) => new URL(request.url).pathname)
    expect(files.some((path) => /\.onnx(?:_data)?$/u.test(path))).toBe(false)
  },
  MODEL_TIMEOUT,
)
