/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {registerDevConsumer} from '@vercel/queue'
import {createApiAiQueue} from '../queue'

const {send, execute} = vi.hoisted(() => ({execute: vi.fn(), send: vi.fn()}))
vi.mock('@vercel/queue', () => ({
  QueueClient: class {
    send = send
  },
  registerDevConsumer: vi.fn(),
}))
const jobId = '00000000-0000-4000-8000-000000000001'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

it('should publish only a durable job reference with a stable deduplication key', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  await createApiAiQueue(execute)(jobId)
  expect(send).toHaveBeenCalledExactlyOnceWith(
    'pomo-api-ai',
    {jobId},
    {
      idempotencyKey: jobId,
      retentionSeconds: 900,
    },
  )
  expect(registerDevConsumer).not.toHaveBeenCalled()
})

it('should register a local consumer before publishing and execute the validated job', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('VERCEL_DEPLOYMENT_ID', undefined)
  await createApiAiQueue(execute)(jobId)
  expect(registerDevConsumer).toHaveBeenCalledBefore(send)
  const [registration] = vi.mocked(registerDevConsumer).mock.calls[0]
  await registration.handler({jobId}, {} as Parameters<typeof registration.handler>[1])
  expect(execute).toHaveBeenCalledExactlyOnceWith(jobId)
  await expect(
    registration.handler({jobId: 'invalid'}, {} as Parameters<typeof registration.handler>[1]),
  ).rejects.toThrow()
  expect(execute).toHaveBeenCalledOnce()
})

it('should leave deployed callback routing to Vercel', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'deployment')
  await createApiAiQueue(execute)(jobId)
  expect(registerDevConsumer).not.toHaveBeenCalled()
})

it('should preserve publish failures so the DB job can be dispatched later', async () => {
  send.mockRejectedValueOnce(new Error('queue unavailable'))
  await expect(createApiAiQueue(execute)(jobId)).rejects.toThrow('queue unavailable')
})
