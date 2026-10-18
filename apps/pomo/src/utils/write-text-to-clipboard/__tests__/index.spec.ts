/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {writeTextToClipboard} from '..'

const native = vi.hoisted(() => ({setText: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Clipboard: native}))

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it.each(['', 'true'])(
  'should preserve clipboard completion and failure for Toss target %s',
  async (target) => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', target)
    const writeText = vi.fn().mockResolvedValue(undefined)
    native.setText.mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    const writer = target === 'true' ? native.setText : writeText
    const other = target === 'true' ? writeText : native.setText
    await expect(writeTextToClipboard('answer')).resolves.toBeUndefined()
    expect(writer).toHaveBeenCalledExactlyOnceWith('answer')
    expect(other).not.toHaveBeenCalled()

    const failure = new Error('Clipboard unavailable')
    writer.mockRejectedValueOnce(failure)
    await expect(writeTextToClipboard('answer')).rejects.toBe(failure)
  },
)
