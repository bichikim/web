/** @vitest-environment node */
import {expect, it} from 'vitest'
import {readCloudTextEvents} from '../job-events'

const usage = {day: '2026-10-08', limit: 3, remaining: 2, resetsAt: '2026-10-08T15:00:00Z', used: 1}
const pending = {
  kind: 'pending',
  requestId: '00000000-0000-4000-8000-000000000001',
  status: 'running',
  usage,
}
const complete = {
  kind: 'complete',
  modelId: 'fallback-model',
  text: '타로 결과',
  tokenCount: 10,
  usage,
}
it('should consume a completion split across frames and Korean UTF-8 byte boundaries', async () => {
  const bytes = new TextEncoder().encode(
    `${JSON.stringify(pending)}\n${JSON.stringify(complete)}\n`,
  )
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      for (const byte of bytes) {
        controller.enqueue(Uint8Array.of(byte))
      }
      controller.close()
    },
  })
  expect(await readCloudTextEvents(stream, new AbortController().signal)).toEqual({
    kind: 'complete',
    response: {modelId: 'fallback-model', text: complete.text, tokenCount: 10, usage},
  })
})
it('should reconnect after a pending connection closes without posting a new generation', async () => {
  const response = new Response(`${JSON.stringify(pending)}\n`)
  if (response.body === null) {
    throw new Error('Expected body')
  }
  expect(await readCloudTextEvents(response.body, new AbortController().signal)).toEqual({
    cause: null,
    kind: 'disconnected',
  })
})
it.each(['failed', 'cancelled'] as const)(
  'should return terminal %s without transport-owned wording',
  async (kind) => {
    const response = new Response(`${JSON.stringify({...pending, kind})}\n`)
    if (response.body === null) {
      throw new Error('Expected body')
    }
    expect(await readCloudTextEvents(response.body, new AbortController().signal)).toEqual({kind})
  },
)
