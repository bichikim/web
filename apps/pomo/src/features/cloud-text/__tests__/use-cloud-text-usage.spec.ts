/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import {useAuth} from 'src/features/auth'
import type {AuthenticatedSession} from 'src/features/auth/machine'
import {createDeferred} from 'src/test-utils/create-deferred'
import {CLOUD_TEXT_USAGE_EVENT, readCloudTextUsage} from '../client'
import type {CloudTextUsage} from '../contracts'
import {useCloudTextUsage} from '../use-cloud-text-usage'

vi.mock('src/features/auth', () => ({useAuth: vi.fn()}))
vi.mock('../client', () => ({
  CLOUD_TEXT_USAGE_EVENT: 'pomo:cloud-text-usage',
  readCloudTextUsage: vi.fn(),
}))

const FIRST_USAGE: CloudTextUsage = {
  day: '2026-10-07',
  limit: 3,
  remaining: 1,
  resetsAt: '2026-10-07T15:00:00.000Z',
  used: 2,
}

beforeEach(() => vi.resetAllMocks())

it('should hide previous account usage until the newly signed-in account resolves', async () => {
  const pending = createDeferred<CloudTextUsage>()
  vi.mocked(readCloudTextUsage)
    .mockResolvedValueOnce(FIRST_USAGE)
    .mockReturnValueOnce(pending.promise)
  const [session, setSession] = createSignal<AuthenticatedSession | null>({
    email: 'first@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(useAuth).mockReturnValue({session} as ReturnType<typeof useAuth>)
  const {result} = renderHook(useCloudTextUsage)
  await waitFor(() => expect(result.usage()).toEqual(FIRST_USAGE), {interval: 1})
  setSession(null)
  expect(result.usage()).toBe(null)
  setSession({email: 'second@example.com', kind: 'authenticated', provider: 'email'})
  expect(result.usage()).toBe(null)
  pending.resolve({...FIRST_USAGE, remaining: 3, used: 0})
  await waitFor(() => expect(result.usage()?.remaining).toBe(3), {interval: 1})
})

it('should expose a failed read and recover on a generation completion event', async () => {
  vi.mocked(readCloudTextUsage)
    .mockRejectedValueOnce(new Error('Usage unavailable'))
    .mockResolvedValueOnce(FIRST_USAGE)
  const [session] = createSignal<AuthenticatedSession>({
    email: 'first@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(useAuth).mockReturnValue({session} as ReturnType<typeof useAuth>)
  const {result} = renderHook(useCloudTextUsage)
  await waitFor(() => expect(result.error()).toBe(true), {interval: 1})
  expect(result.usage()).toBe(null)
  globalThis.dispatchEvent(new Event(CLOUD_TEXT_USAGE_EVENT))
  await waitFor(() => expect(result.usage()).toEqual(FIRST_USAGE), {interval: 1})
  expect(result.error()).toBe(false)
})

it('should refresh usage when the document becomes visible', async () => {
  const pending = createDeferred<CloudTextUsage>()
  vi.mocked(readCloudTextUsage)
    .mockResolvedValueOnce(FIRST_USAGE)
    .mockReturnValueOnce(pending.promise)
  const [session] = createSignal<AuthenticatedSession>({
    email: 'first@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(useAuth).mockReturnValue({session} as ReturnType<typeof useAuth>)
  const {cleanup, result} = renderHook(useCloudTextUsage)
  await waitFor(() => expect(result.usage()).toEqual(FIRST_USAGE), {interval: 1})

  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
  document.dispatchEvent(new Event('visibilitychange'))
  expect(readCloudTextUsage).toHaveBeenCalledOnce()

  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
  document.dispatchEvent(new Event('visibilitychange'))
  expect(readCloudTextUsage).toHaveBeenCalledTimes(2)
  expect(result.usage()).toEqual(FIRST_USAGE)
  pending.resolve({...FIRST_USAGE, remaining: 0, used: 3})
  await waitFor(() => expect(result.usage()?.remaining).toBe(0), {interval: 1})
  cleanup()
})

it('should retain same-account usage during refresh and stop listeners on disposal', async () => {
  const pending = createDeferred<CloudTextUsage>()
  vi.mocked(readCloudTextUsage)
    .mockResolvedValueOnce(FIRST_USAGE)
    .mockReturnValueOnce(pending.promise)
  const [session] = createSignal<AuthenticatedSession>({
    email: 'first@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(useAuth).mockReturnValue({session} as ReturnType<typeof useAuth>)
  const {cleanup, result} = renderHook(useCloudTextUsage)
  await waitFor(() => expect(result.usage()).toEqual(FIRST_USAGE), {interval: 1})
  globalThis.dispatchEvent(new Event(CLOUD_TEXT_USAGE_EVENT))
  expect(result.usage()).toEqual(FIRST_USAGE)
  pending.resolve({...FIRST_USAGE, remaining: 0, used: 3})
  await waitFor(() => expect(result.usage()?.remaining).toBe(0), {interval: 1})
  cleanup()
  globalThis.dispatchEvent(new Event(CLOUD_TEXT_USAGE_EVENT))
  globalThis.dispatchEvent(new Event('focus'))
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
  document.dispatchEvent(new Event('visibilitychange'))
  expect(readCloudTextUsage).toHaveBeenCalledTimes(2)
})
