import {afterEach, expect, it, vi} from 'vitest'
import {browserAiJobStorage, type StoredAiTextJob} from '../storage'

const key = 'pomo:ai-text-job:v1'
const job: StoredAiTextJob = {
  idempotencyKey: 'request-123',
  input: {messages: [{content: 'Hello', role: 'user'}]},
  jobId: null,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should write, read and clear the stored job', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (item: string) => values.get(item) ?? null,
    removeItem: (item: string) => values.delete(item),
    setItem: (item: string, value: string) => values.set(item, value),
  })

  browserAiJobStorage.write(job)
  expect(browserAiJobStorage.read()).toEqual(job)
  browserAiJobStorage.clear()
  expect(browserAiJobStorage.read()).toBeNull()
})

it('should ignore malformed and schema-invalid stored jobs without logging', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const storage = {getItem: vi.fn(() => '{invalid')}
  vi.stubGlobal('sessionStorage', storage)
  expect(browserAiJobStorage.read()).toBeNull()
  storage.getItem.mockReturnValue(JSON.stringify({...job, idempotencyKey: 'short'}))
  expect(browserAiJobStorage.read()).toBeNull()
  expect(warning).not.toHaveBeenCalled()
})

it('should ignore inaccessible storage and failed operations without logging', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const failure = new Error('blocked')
  vi.stubGlobal('sessionStorage', {
    getItem: () => {
      throw failure
    },
    removeItem: () => {
      throw failure
    },
    setItem: () => {
      throw failure
    },
  })
  expect(browserAiJobStorage.read()).toBeNull()
  expect(() => browserAiJobStorage.write(job)).not.toThrow()
  expect(() => browserAiJobStorage.clear()).not.toThrow()
  expect(warning).not.toHaveBeenCalled()
})
