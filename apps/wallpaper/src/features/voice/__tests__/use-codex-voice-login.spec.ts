/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {useCodexVoiceLogin} from '../use-codex-voice-login'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn(() => true)}))
afterEach(() => vi.resetAllMocks())

it('should expose only readiness and recheck credentials on request', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValueOnce(undefined).mockRejectedValueOnce('loginRequired')
  const hook = renderHook(useCodexVoiceLogin)
  await vi.waitFor(() => expect(hook.result.status()).toBe('ready'))
  expect(invoke).toHaveBeenCalledWith('codex_voice_login_status')
  await hook.result.refresh()
  expect(hook.result.status()).toBe('loginRequired')
  hook.cleanup()
})

it('should report unavailable instead of treating an unexpected error as a login failure', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockRejectedValueOnce('desktopOnly')
  const hook = renderHook(useCodexVoiceLogin)
  await vi.waitFor(() => expect(hook.result.status()).toBe('unavailable'))
  hook.cleanup()
})

it('should avoid native access outside the desktop app', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const hook = renderHook(useCodexVoiceLogin)
  await vi.waitFor(() => expect(hook.result.status()).toBe('desktopOnly'))
  expect(invoke).not.toHaveBeenCalled()
  hook.cleanup()
})
