/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {aiJobClient} from '../client'
import {browserAiJobStorage} from '../storage'
import {useAiTextJob} from '../use-ai-text-job'

it('should keep local execution and avoid restoring or requesting unreleased server jobs', async () => {
  const read = vi.spyOn(browserAiJobStorage, 'read')
  const access = vi
    .spyOn(aiJobClient, 'readTextAccess')
    .mockResolvedValue({available: true, modelId: 'gpt-5.6-luna'})
  const submit = vi.spyOn(aiJobClient, 'submitTextJob')
  const {cleanup, result} = renderHook(() => useAiTextJob({onComplete: vi.fn()}))
  globalThis.dispatchEvent(new Event('online'))
  document.dispatchEvent(new Event('visibilitychange'))
  await Promise.resolve()
  result.setExecutionMode('server')
  expect(result.executionMode()).toBe('local')
  await expect(result.submit('hello')).resolves.toBe(false)
  expect(read).not.toHaveBeenCalled()
  expect(access).not.toHaveBeenCalled()
  expect(submit).not.toHaveBeenCalled()
  cleanup()
  vi.restoreAllMocks()
})
