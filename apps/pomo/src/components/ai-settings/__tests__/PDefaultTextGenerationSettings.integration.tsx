/** @vitest-environment jsdom */

import {render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Suspense} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import type {AuthenticatedSession} from 'src/features/auth/machine'
import {createDeferred} from 'src/test-utils/create-deferred'
import type {CloudTextUsage} from 'src/features/cloud-text/contracts'
import {PDefaultTextGenerationSettings} from '../PDefaultTextGenerationSettings'

const mocks = vi.hoisted(() => ({
  preferenceRead: vi.fn(),
  preferenceWrite: vi.fn(),
  readUsage: vi.fn(),
  session: vi.fn(),
}))

vi.mock('src/features/auth', () => ({useAuth: () => ({session: mocks.session})}))
vi.mock('src/features/cloud-text/client', () => ({
  CLOUD_TEXT_USAGE_EVENT: 'pomo:cloud-text-usage',
  readCloudTextUsage: mocks.readUsage,
}))
vi.mock('src/features/text-generation/settings', async () => {
  const actual = await vi.importActual<typeof import('src/features/text-generation/settings')>(
    'src/features/text-generation/settings',
  )
  return {
    ...actual,
    createTextGenerationPreferenceOptions: (options = {}) => ({
      ...actual.createTextGenerationPreferenceOptions(options),
      storage: {read: mocks.preferenceRead, write: mocks.preferenceWrite},
    }),
  }
})

const usage = (remaining: number): CloudTextUsage => ({
  day: '2026-10-07',
  limit: 3,
  remaining,
  resetsAt: '2026-10-07T15:00:00.000Z',
  used: 3 - remaining,
})

const renderSettings = () =>
  render(() => (
    <Suspense fallback={<p>settings body fallback</p>}>
      <PreferenceProvider>
        <PDefaultTextGenerationSettings />
      </PreferenceProvider>
    </Suspense>
  ))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.preferenceRead.mockResolvedValue({modelId: 'cloud', version: 1})
  mocks.preferenceWrite.mockResolvedValue(undefined)
})

it('keeps the settings subtree mounted through usage loads and protects account ownership', async () => {
  const initialUsage = createDeferred<CloudTextUsage>()
  const staleRefresh = createDeferred<CloudTextUsage>()
  const replacementUsage = createDeferred<CloudTextUsage>()
  mocks.readUsage
    .mockReturnValueOnce(initialUsage.promise)
    .mockReturnValueOnce(staleRefresh.promise)
    .mockReturnValueOnce(replacementUsage.promise)

  const firstSession: AuthenticatedSession = {
    email: 'first@example.com',
    kind: 'authenticated',
    provider: 'email',
  }
  const secondSession: AuthenticatedSession = {
    email: 'second@example.com',
    kind: 'authenticated',
    provider: 'email',
  }
  const [session, setSession] = createSignal<AuthenticatedSession | null>(firstSession)
  mocks.session.mockImplementation(session)

  renderSettings()

  await waitFor(() =>
    expect(document.querySelector('button[aria-label="기본 문장 생성 모델"]')).not.toBeNull(),
  )
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-label="기본 문장 생성 모델"]',
  )
  if (trigger === null) {
    throw new Error('Expected the usage label to be inside the model selector trigger')
  }
  expect(screen.queryByText('settings body fallback')).not.toBeInTheDocument()
  expect(trigger).toHaveTextContent('확인 중')

  initialUsage.resolve(usage(2))
  await waitFor(() => expect(trigger).toHaveTextContent('2회 남음'))
  trigger.focus()
  expect(document.activeElement).toBe(trigger)

  globalThis.dispatchEvent(new Event('focus'))
  await waitFor(() => expect(mocks.readUsage).toHaveBeenCalledTimes(2))
  expect(trigger.isConnected).toBe(true)
  expect(document.activeElement).toBe(trigger)
  expect(screen.queryByText('settings body fallback')).not.toBeInTheDocument()

  setSession(secondSession)
  await waitFor(() => expect(mocks.readUsage).toHaveBeenCalledTimes(3))
  expect(trigger).toHaveTextContent('확인 중')
  expect(trigger).not.toHaveTextContent('2회 남음')

  staleRefresh.resolve(usage(0))
  await Promise.resolve()
  expect(trigger).toHaveTextContent('확인 중')
  expect(trigger).not.toHaveTextContent('0회 남음')

  replacementUsage.resolve(usage(3))
  await waitFor(() => expect(trigger).toHaveTextContent('3회 남음'))

  setSession(null)
  expect(trigger).toHaveTextContent('로그인 해주세요')
  expect(trigger).not.toHaveTextContent('3회 남음')
})
