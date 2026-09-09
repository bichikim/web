import {afterEach, expect, it, vi} from 'vitest'
import {copyToolResult} from '../clipboard'

const {setText} = vi.hoisted(() => ({setText: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Clipboard: {setText}}))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it('should write web results and report denied clipboard access', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'false')
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', {clipboard: {writeText}})
  await expect(copyToolResult('3.28 ft')).resolves.toBe(true)
  expect(writeText).toHaveBeenCalledWith('3.28 ft')
  writeText.mockRejectedValue(new Error('denied'))
  await expect(copyToolResult('result')).resolves.toBe(false)
  expect(setText).not.toHaveBeenCalled()
})
it('should use the Toss clipboard bridge and report a bridge rejection', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  setText.mockResolvedValue(undefined)
  await expect(copyToolResult('2026-02-17')).resolves.toBe(true)
  expect(setText).toHaveBeenCalledWith('2026-02-17')
  setText.mockRejectedValue(new Error('denied'))
  await expect(copyToolResult('result')).resolves.toBe(false)
})
